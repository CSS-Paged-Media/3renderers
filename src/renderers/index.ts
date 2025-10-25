import { renderWeasyPrint } from './weasyprint';
import { renderPagedJS } from './pagedjs';
import { renderVivliostyle } from './vivliostyle';

export async function renderPDF(
  html: string,
  renderer: 'weasyprint' | 'pagedjs' | 'vivliostyle'
): Promise<Buffer> {
  switch (renderer) {
    case 'weasyprint':
      return renderWeasyPrint(html);
    case 'pagedjs':
      return renderPagedJS(html);
    case 'vivliostyle':
      return renderVivliostyle(html);
    default:
      throw new Error(`Unknown renderer: ${renderer}`);
  }
}