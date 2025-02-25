import {
  CommonFieldConfig,
  BaseListTypeInfo,
  FieldTypeFunc,
  jsonFieldTypePolyfilledForSQLite,
} from '@keystone-6/core/types';
import { graphql } from '@keystone-6/core';
import { createId as cuid2 } from '@paralleldrive/cuid2';
import cloudinary from 'cloudinary';
import { CloudinaryAdapter } from './cloudinary';

type StoredFile = {
  id: string;
  filename: string;
  originalFilename: string;
  mimetype: any;
  encoding: any;
  _meta: cloudinary.UploadApiResponse;
};

type CloudinaryImageFieldConfig<ListTypeInfo extends BaseListTypeInfo> =
  CommonFieldConfig<ListTypeInfo> & {
    cloudinary: {
      cloudName: string;
      apiKey: string;
      apiSecret: string;
      folder?: string;
    };
    db?: { map?: string };
  };

const CloudinaryImageFormat = graphql.inputObject({
  name: 'CloudinaryImageFormat',
  description:
    'Mirrors the formatting options [Cloudinary provides](https://cloudinary.com/documentation/image_transformation_reference).\n' +
    'All options are strings as they ultimately end up in a URL.',
  fields: {
    prettyName: graphql.arg({
      description: ' Rewrites the filename to be this pretty string. Do not include `/` or `.`',
      type: graphql.String,
    }),
    width: graphql.arg({ type: graphql.String }),
    height: graphql.arg({ type: graphql.String }),
    crop: graphql.arg({ type: graphql.String }),
    aspect_ratio: graphql.arg({ type: graphql.String }),
    gravity: graphql.arg({ type: graphql.String }),
    zoom: graphql.arg({ type: graphql.String }),
    x: graphql.arg({ type: graphql.String }),
    y: graphql.arg({ type: graphql.String }),
    format: graphql.arg({ type: graphql.String }),
    fetch_format: graphql.arg({ type: graphql.String }),
    quality: graphql.arg({ type: graphql.String }),
    radius: graphql.arg({ type: graphql.String }),
    angle: graphql.arg({ type: graphql.String }),
    effect: graphql.arg({ type: graphql.String }),
    opacity: graphql.arg({ type: graphql.String }),
    border: graphql.arg({ type: graphql.String }),
    background: graphql.arg({ type: graphql.String }),
    overlay: graphql.arg({ type: graphql.String }),
    underlay: graphql.arg({ type: graphql.String }),
    default_image: graphql.arg({ type: graphql.String }),
    delay: graphql.arg({ type: graphql.String }),
    color: graphql.arg({ type: graphql.String }),
    color_space: graphql.arg({ type: graphql.String }),
    dpr: graphql.arg({ type: graphql.String }),
    page: graphql.arg({ type: graphql.String }),
    density: graphql.arg({ type: graphql.String }),
    flags: graphql.arg({ type: graphql.String }),
    transformation: graphql.arg({ type: graphql.String }),
  },
});

type CloudinaryImage_File = {
  id: string | null;
  filename: string | null;
  originalFilename: string | null;
  mimetype: string | null;
  encoding: string | null;
  publicUrl: string | null;
  publicUrlTransformed: (args: {
    transformation: graphql.InferValueFromArg<graphql.Arg<typeof CloudinaryImageFormat>>;
  }) => string | null;
};

// TODO: lvalue type required by pnpm :(
export const outputType: graphql.ObjectType<CloudinaryImage_File> =
  graphql.object<CloudinaryImage_File>()({
    name: 'CloudinaryImage_File',
    fields: {
      id: graphql.field({ type: graphql.ID }),
      // path: types.field({ type: types.String }),
      filename: graphql.field({ type: graphql.String }),
      originalFilename: graphql.field({ type: graphql.String }),
      mimetype: graphql.field({ type: graphql.String }),
      encoding: graphql.field({ type: graphql.String }),
      publicUrl: graphql.field({ type: graphql.String }),
      publicUrlTransformed: graphql.field({
        args: {
          transformation: graphql.arg({ type: CloudinaryImageFormat }),
        },
        type: graphql.String,
        resolve(rootVal, args) {
          return rootVal.publicUrlTransformed(args);
        },
      }),
    },
  });

export const cloudinaryImage =
  <ListTypeInfo extends BaseListTypeInfo>({
    cloudinary,
    ...config
  }: CloudinaryImageFieldConfig<ListTypeInfo>): FieldTypeFunc<ListTypeInfo> =>
  meta => {
    if ((config as any).isIndexed === 'unique') {
      throw Error("isIndexed: 'unique' is not a supported option for field type cloudinaryImage");
    }
    const adapter = new CloudinaryAdapter(cloudinary);
    const inputArg = graphql.arg({ type: graphql.Upload });
    const resolveInput = async (
      uploadData: graphql.InferValueFromArg<typeof inputArg>
    ): Promise<StoredFile | undefined | null | 'DbNull'> => {
      if (uploadData === null) {
        return meta.provider === 'postgresql' || meta.provider === 'mysql' ? 'DbNull' : null;
      }
      if (uploadData === undefined) {
        return undefined;
      }

      const { createReadStream, filename: originalFilename, mimetype, encoding } = await uploadData;
      const stream = createReadStream();

      if (!stream) {
        // TODO: FIXME: Handle when stream is null. Can happen when:
        // Updating some other part of the item, but not the file (gets null
        // because no File DOM element is uploaded)
        return undefined;
      }

      const { id, filename, _meta } = await adapter.save({
        stream,
        filename: originalFilename,
        id: cuid2(),
      });

      return { id, filename, originalFilename, mimetype, encoding, _meta };
    };
    return jsonFieldTypePolyfilledForSQLite(
      meta.provider,
      {
        ...config,
        __ksTelemetryFieldTypeName: '@keystone-6/cloudinary',
        input: {
          create: { arg: inputArg, resolve: resolveInput },
          update: { arg: inputArg, resolve: resolveInput },
        },
        output: graphql.field({
          type: outputType,
          resolve({ value }) {
            if (value === null) {
              return null;
            }
            const val = value as any;
            return {
              publicUrl: adapter.publicUrl(val),
              publicUrlTransformed: ({
                transformation,
              }: {
                transformation: graphql.InferValueFromArg<
                  graphql.Arg<typeof CloudinaryImageFormat>
                >;
              }) => adapter.publicUrlTransformed(val, transformation ?? {}),
              ...val,
            };
          },
        }),
        views: '@keystone-6/cloudinary/views',
      },
      {
        map: config.db?.map,
      }
    );
  };
