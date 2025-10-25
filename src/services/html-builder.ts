export class HtmlBuilder {
  /**
   * Combine HTML and CSS - mimics original PHP logic
   */
  static combineHTMLandCSS(html: string, css: string): string {
    const cssTag = css.trim() !== '' ? `<style>${css}</style>` : '';

    // Check if HTML has <html> tag
    if (html.indexOf('<html') === -1) {
      return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
${cssTag}
</head>
<body>
${html}
</body>
</html>`;
    }
    
    // Check if HTML has </head> tag
    if (html.indexOf('</head>') !== -1) {
      return html.replace(
        '</head>',
        `${cssTag}<meta charset="UTF-8"></head>`
      );
    }
    
    // No proper structure, just prepend CSS
    return cssTag + html;
  }

  /**
   * Add JavaScript to HTML
   */
  static addJavaScript(html: string, javascript: string): string {
    const jsTag = javascript.trim() !== '' 
      ? `<script type="text/javascript">${javascript}</script>` 
      : '';

    if (html.indexOf('</body>') !== -1) {
      return html.replace('</body>', `${jsTag}</body>`);
    }
    
    // No body tag, append at end
    return html + jsTag;
  }

  /**
   * Complete HTML building process
   */
  static build(html: string, css: string = '', javascript: string = ''): string {
    let combined = this.combineHTMLandCSS(html, css);
    combined = this.addJavaScript(combined, javascript);
    return combined;
  }
}