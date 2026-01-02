/**
 * Normalize a name to Wikipedia article title format
 * Wikipedia uses underscores for spaces and is case-sensitive for the first letter
 */
export function normalizeWikipediaTitle(name: string): string {
  if (!name) return "";
  
  // Trim whitespace
  let normalized = name.trim();
  
  // Replace spaces with underscores
  normalized = normalized.replace(/\s+/g, "_");
  
  // Wikipedia titles are typically capitalized (first letter uppercase, rest lowercase)
  // But we'll preserve the original casing since Wikipedia is case-sensitive
  // and many scientific names have specific casing
  
  // URL encode any special characters that remain
  // Note: We'll do URL encoding in the API call, not here
  // This function just handles the basic Wikipedia title format
  
  return normalized;
}

