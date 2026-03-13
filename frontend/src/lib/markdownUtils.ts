export const splitMarkdownIntoSections = (markdown: string) => {
  // A simple heuristic to split a markdown resume by headers (## or #)
  // This logic returns an array of section strings.
  
  if (!markdown) return [];

  const lines = markdown.split('\n');
  const sections: string[] = [];
  let currentSection = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line is a header but not the title header if we have one
    if (line.match(/^#{1,3}\s+/) && currentSection.trim().length > 0) {
      sections.push(currentSection);
      currentSection = line + '\n';
    } else {
      currentSection += line + '\n';
    }
  }

  if (currentSection.trim().length > 0) {
    sections.push(currentSection);
  }

  return sections;
};
