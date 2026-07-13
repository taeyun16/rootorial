import { useEffect } from "react";
import { useLocale } from "../features/localization/localization";
import type { PageMetadata } from "../features/localization/page-metadata";

export function PageMetadataSync({
  metadata,
}: {
  metadata: Record<"ko" | "en", PageMetadata>;
}) {
  const { locale } = useLocale();

  useEffect(() => {
    document.title = metadata[locale].title;
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (description) description.content = metadata[locale].description;
  }, [locale, metadata]);

  return null;
}
