import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'officeBearer',
  title: 'Office Bearer',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      description: 'Position or title (e.g., "President", "Secretary")',
    }),
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'photoPosition',
      title: 'Photo Position',
      type: 'string',
      description: 'CSS object-position override (e.g., "center top", "50% 30%")',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Executive', value: 'executive' },
          { title: 'Board', value: 'board' },
        ],
        layout: 'radio',
      },
      initialValue: 'executive',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'year',
      title: 'Term Year',
      type: 'string',
      description: 'Term year (e.g., "2025")',
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'isActive',
      title: 'Active',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  orderings: [
    {
      title: 'Category, then Order',
      name: 'categoryOrder',
      by: [
        { field: 'category', direction: 'asc' },
        { field: 'order', direction: 'asc' },
      ],
    },
    {
      title: 'Display Order',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'name', subtitle: 'role', year: 'year', media: 'photo' },
    prepare({ title, subtitle, year, media }) {
      return {
        title,
        subtitle: [subtitle, year].filter(Boolean).join(' — '),
        media,
      }
    },
  },
})
