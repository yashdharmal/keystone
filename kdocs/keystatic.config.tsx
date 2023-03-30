import {
  collection,
  config,
  fields,
  singleton,
} from '@keystatic/core';

export default config({
  storage: {
    kind: 'github',
    repo: {
      owner: 'keystonejs',
      name: 'keystone',
    },
  },
  singletons: {
    index: singleton({
      label: 'Introduction',
      path: 'docs/content/singletons/index/',
      schema: {
        content: fields.document({
          label: 'Content',
          formatting: true,
        }),
      },
    }),
  },
  collections: {
    pages: collection({
      label: 'Pages',
      path: 'docs/content/pages/*/',
      slugField: 'title',
      schema: {
        title: fields.slug({
          name: {
            label: 'Title',
            validation: { length: { min: 1 } },
          },
        }),
        description: fields.text({
          label: 'Summary',
          validation: { length: { min: 4 } },
        }),
        content: fields.document({
          label: 'Content',
          formatting: true,
        }),
        related: fields.array({
          ...fields.object({
            heading: fields.text({ label: 'Heading' }),
            href: fields.text({ label: 'href' }),
            description: fields.text({ label: 'Description' }),
          }),
        }),
      },
    }),
  },
});
