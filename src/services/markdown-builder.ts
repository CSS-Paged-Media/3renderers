import MarkdownIt from 'markdown-it';
import { TemplateEngine } from './template-engine';
import { SecurityService } from './security';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
});

const templateEngine = new TemplateEngine();

export async function markdownToHtml(markdownSource: string, data: Record<string, any> = {}): Promise<string> {
  const templated = await templateEngine.renderSingle(markdownSource, data);
  const cleaned = SecurityService.clearStringFromFTPandFileLinks(templated);
  const html = md.render(cleaned);

  return html;
}

export default { markdownToHtml };