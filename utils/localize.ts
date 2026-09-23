import type { AppLocale } from "~/i18n/messages"

type NamedEntity = {
  name_en: string
  name_ar: string
}

type DescribedEntity = NamedEntity & {
  description_en: string
  description_ar: string
}

export function localizedName(
  entity: NamedEntity,
  locale: AppLocale,
): string {
  if (locale === "ar") {
    return entity.name_ar || entity.name_en
  }
  return entity.name_en || entity.name_ar
}

export function localizedDescription(
  entity: DescribedEntity,
  locale: AppLocale,
): string {
  if (locale === "ar") {
    return entity.description_ar || entity.description_en
  }
  return entity.description_en || entity.description_ar
}
