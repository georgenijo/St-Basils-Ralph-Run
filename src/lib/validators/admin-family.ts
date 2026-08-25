import { z } from 'zod'

const nullableText = (max: number, message: string) =>
  z.union([z.string().trim().max(max, message), z.null()]).transform((value) => value || null)

const nullableUuid = z
  .union([z.string().uuid('Invalid user ID'), z.literal(''), z.null()])
  .transform((value) => value || null)

const nullableMembershipType = z
  .union([z.enum(['monthly', 'annual']), z.literal(''), z.null()])
  .transform((value) => value || null)

const nullableDate = z
  .union([
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid membership expiry date')
      .refine(
        (value) => {
          const date = new Date(`${value}T00:00:00Z`)
          return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
        },
        { message: 'Invalid membership expiry date' }
      ),
    z.literal(''),
    z.null(),
  ])
  .transform((value) => value || null)

export const createFamilySchema = z.object({
  family_name: z
    .string()
    .trim()
    .min(1, 'Family name is required')
    .max(200, 'Family name must be 200 characters or less'),
  phone: nullableText(50, 'Phone must be 50 characters or less'),
  address: nullableText(500, 'Address must be 500 characters or less'),
  membership_status: z.enum(['active', 'expired', 'pending']),
  membership_type: nullableMembershipType,
  membership_expires_at: nullableDate,
})

export const updateFamilyAdminSchema = z.object({
  family_id: z.string().uuid('Invalid family ID'),
  membership_status: z.enum(['active', 'expired', 'pending']),
  membership_type: nullableMembershipType,
  membership_expires_at: nullableDate,
  head_of_household: nullableUuid,
})

export const assignUserToFamilySchema = z.object({
  family_id: z.string().uuid('Invalid family ID'),
  user_id: z.string().uuid('Invalid user ID'),
})

export const removeUserFromFamilySchema = z.object({
  family_id: z.string().uuid('Invalid family ID'),
  user_id: z.string().uuid('Invalid user ID'),
})
