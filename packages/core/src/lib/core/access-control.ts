import { assertInputObjectType } from 'graphql';
import {
  BaseListTypeInfo,
  CreateListItemAccessControl,
  FieldAccessControl,
  IndividualFieldAccessControl,
  ListAccessControl,
  DeleteListItemAccessControl,
  FieldCreateItemAccessArgs,
  FieldReadItemAccessArgs,
  FieldUpdateItemAccessArgs,
  UpdateListItemAccessControl,
  ListOperationAccessControl,
  ListFilterAccessControl,
  KeystoneContext,
} from '../../types';
import { coerceAndValidateForGraphQLInput } from '../coerceAndValidateForGraphQLInput';
import { allowAll } from '../../access';
import { accessReturnError, extensionError } from './graphql-errors';
import { InitialisedList } from './types-for-lists';
import { InputFilter } from './where-inputs';

export function cannotForItem(operation: string, list: InitialisedList) {
  return (
    `You cannot ${operation} that ${list.listKey}` +
    (operation === 'create' ? '' : ' - it may not exist')
  );
}

export function cannotForItemFields(
  operation: string,
  list: InitialisedList,
  fieldsDenied: string[]
) {
  return `You cannot ${operation} that ${
    list.listKey
  } - you cannot ${operation} the fields ${JSON.stringify(fieldsDenied)}`;
}

export async function getOperationAccess(
  list: InitialisedList,
  context: KeystoneContext,
  operation: 'query' | 'create' | 'update' | 'delete'
) {
  const args = { operation, session: context.session, listKey: list.listKey, context };
  const access = list.access.operation[operation];
  let result;
  try {
    // @ts-ignore
    result = await access(args);
  } catch (error: any) {
    throw extensionError('Access control', [
      { error, tag: `${list.listKey}.access.operation.${args.operation}` },
    ]);
  }

  if (typeof result !== 'boolean') {
    throw accessReturnError([
      { tag: `${args.listKey}.access.operation.${args.operation}`, returned: typeof result },
    ]);
  }

  return result;
}

export async function getAccessFilters(
  list: InitialisedList,
  context: KeystoneContext,
  operation: keyof typeof list.access.filter
): Promise<boolean | InputFilter> {
  try {
    let filters;
    if (operation === 'query') {
      filters = await list.access.filter.query({
        operation,
        session: context.session,
        listKey: list.listKey,
        context,
      });
    } else if (operation === 'update') {
      filters = await list.access.filter.update({
        operation,
        session: context.session,
        listKey: list.listKey,
        context,
      });
    } else if (operation === 'delete') {
      filters = await list.access.filter.delete({
        operation,
        session: context.session,
        listKey: list.listKey,
        context,
      });
    }

    if (typeof filters === 'boolean') return filters;
    if (!filters) return false; // shouldn't happen, but, Typescript

    const schema = context.sudo().graphql.schema;
    const whereInput = assertInputObjectType(schema.getType(list.graphql.names.whereInputName));
    const result = coerceAndValidateForGraphQLInput(schema, whereInput, filters);
    if (result.kind === 'valid') return result.value;
    throw result.error;
  } catch (error: any) {
    throw extensionError('Access control', [
      { error, tag: `${list.listKey}.access.filter.${operation}` },
    ]);
  }
}

export type ResolvedFieldAccessControl = {
  create: IndividualFieldAccessControl<FieldCreateItemAccessArgs<BaseListTypeInfo>>;
  read: IndividualFieldAccessControl<FieldReadItemAccessArgs<BaseListTypeInfo>>;
  update: IndividualFieldAccessControl<FieldUpdateItemAccessArgs<BaseListTypeInfo>>;
};

export function parseFieldAccessControl(
  access: FieldAccessControl<BaseListTypeInfo> | undefined
): ResolvedFieldAccessControl {
  if (typeof access === 'function') {
    return { read: access, create: access, update: access };
  }

  return {
    read: access?.read ?? allowAll,
    create: access?.create ?? allowAll,
    update: access?.update ?? allowAll,
  };
}

export type ResolvedListAccessControl = {
  operation: {
    query: ListOperationAccessControl<'query', BaseListTypeInfo>;
    create: ListOperationAccessControl<'create', BaseListTypeInfo>;
    update: ListOperationAccessControl<'update', BaseListTypeInfo>;
    delete: ListOperationAccessControl<'delete', BaseListTypeInfo>;
  };
  filter: {
    query: ListFilterAccessControl<'query', BaseListTypeInfo>;
    // create: not supported
    update: ListFilterAccessControl<'update', BaseListTypeInfo>;
    delete: ListFilterAccessControl<'delete', BaseListTypeInfo>;
  };
  item: {
    // query: not supported
    create: CreateListItemAccessControl<BaseListTypeInfo>;
    update: UpdateListItemAccessControl<BaseListTypeInfo>;
    delete: DeleteListItemAccessControl<BaseListTypeInfo>;
  };
};

export function parseListAccessControl(
  access: ListAccessControl<BaseListTypeInfo>
): ResolvedListAccessControl {
  if (typeof access === 'function') {
    return {
      operation: {
        query: access,
        create: access,
        update: access,
        delete: access,
      },
      filter: {
        query: allowAll,
        update: allowAll,
        delete: allowAll,
      },
      item: {
        create: allowAll,
        update: allowAll,
        delete: allowAll,
      },
    };
  }

  let { operation, filter, item } = access;
  if (typeof operation === 'function') {
    operation = {
      query: operation,
      create: operation,
      update: operation,
      delete: operation,
    };
  }

  return {
    operation: {
      query: operation.query ?? allowAll,
      create: operation.create ?? allowAll,
      update: operation.update ?? allowAll,
      delete: operation.delete ?? allowAll,
    },
    filter: {
      query: filter?.query ?? allowAll,
      // create: not supported
      update: filter?.update ?? allowAll,
      delete: filter?.delete ?? allowAll,
    },
    item: {
      // query: not supported
      create: item?.create ?? allowAll,
      update: item?.update ?? allowAll,
      delete: item?.delete ?? allowAll,
    },
  };
}
