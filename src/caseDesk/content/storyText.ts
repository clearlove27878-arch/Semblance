export function storyParagraphs(text: string): string[] {
  return text
    .replaceAll('治疗师', '岚')
    .replaceAll('男主', '枫')
    .replaceAll('女主', '玲')
    .replaceAll('第四人', '峥')
    .split(/\n\n+/);
}
