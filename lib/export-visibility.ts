/** Keep exports attached to the selected video version, including single-version legacy projects. */
export function isExportForVariant(
  result: { variantId?: string } | undefined,
  selectedVariantId: string | undefined,
  variantCount: number,
) {
  if (!selectedVariantId) return false;
  return result?.variantId
    ? result.variantId === selectedVariantId
    : variantCount === 1;
}
