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
      path: 'content/singletons/index/',
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
      path: 'content/pages/*/',
      slugField: 'title',
      schema: {
        title: fields.slug({
          name: {
            label: 'Title',
            validation: {
              length: {
                min: 1,
              },
            },
          },
        }),
        summary: fields.text({
          label: 'Summary',
          validation: { length: { min: 4 } },
        }),
        publishedDate: fields.date({ label: 'Published Date' }),
        images: fields.array({
          ...fields.object({
            image: fields.image({ label: 'Image', directory: 'public' }),
            alt: fields.text({ label: 'Alt text' }),
          }),
        }),
        content: fields.document({
          label: 'Content',
          formatting: true,
        }),
      },
    }),
  },
});
