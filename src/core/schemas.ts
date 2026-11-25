import { z } from 'zod';

export const DiscountRuleSchema = z
  .object({
    ruleId: z.string().trim().min(1, 'Rule ID is required.'),
    scope: z.enum(['platform', 'brand', 'cart'], { errorMap: () => ({ message: 'Scope must be platform, brand or cart.' }) }),
    appliesTo: z.string().trim().nullable().default(null),
    type: z.enum(['percentage', 'flat'], { errorMap: () => ({ message: 'Type must be percentage or flat.' }) }),
    value: z
      .number({ invalid_type_error: 'Discount value must be a number.', required_error: 'Discount value is required.' })
      .finite('Discount value must be a finite number.')
      .positive('Discount value must be greater than 0 (negative values are not allowed).'),
    stackable: z.boolean().default(false),
    minCartValue: z.number().finite().nonnegative('Minimum cart value cannot be negative.').nullable().default(null),
    source: z.enum(['csv', 'nl', 'manual']).default('csv'),
  })
  .superRefine((r, ctx) => {
    if (r.scope !== 'cart' && !r.appliesTo)
      ctx.addIssue({ code: 'custom', path: ['appliesTo'], message: `A ${r.scope} rule needs a target in "Applies To" (e.g. a ${r.scope} name).` });
    if (r.scope === 'cart' && r.minCartValue == null)
      ctx.addIssue({ code: 'custom', path: ['minCartValue'], message: 'A cart rule needs a minimum cart value.' });
    if (r.type === 'percentage' && r.value > 100)
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'A percentage discount cannot exceed 100.' });
  })
  .transform(r => ({ ...r, appliesTo: r.scope === 'cart' ? null : r.appliesTo }));

export const CartItemSchema = z.object({
  itemId: z.string().trim().min(1, 'Item ID is required.'),
  product: z.string().trim().min(1, 'Product is required.'),
  brand: z.string().trim().min(1, 'Brand is required.'),
  platform: z.string().trim().min(1, 'Platform is required.'),
  basePrice: z
    .number({ invalid_type_error: 'Base price must be a number.', required_error: 'Base price is required.' })
    .finite()
    .positive('Base price must be greater than 0.')
    .refine(Number.isInteger, 'Base price must be a whole-rupee amount (e.g. 1299).'),
});
