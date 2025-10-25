export class SecurityService {
  /**
   * Remove FTP, file://, sftp:// links and etc/passwd references
   */
  static clearStringFromFTPandFileLinks(content: string): string {
    // Remove etc/passwd references
    let cleaned = content.replace(/etc\/passwd/gi, '');
    
    // Remove FTP/File/SFTP protocol URLs
    cleaned = cleaned.replace(
      /\b(ftp|file|sftp):\/\/[-A-Z0-9+&@#\/%?=~_|$!:,.;]*[A-Z0-9+&@#\/%=~_|$]/gi,
      ''
    );
    
    // Remove link tags with rel="attachment"
    cleaned = cleaned.replace(
      /(<link\s(?:[^>]*rel\s?=\s?["']?attachment["']?)[^>]*>)/gi,
      ''
    );
    
    return cleaned;
  }

  /**
   * Sanitize all inputs before processing
   */
  static sanitizeInputs(html: string, css: string = '', javascript: string = ''): {
    html: string;
    css: string;
    javascript: string;
  } {
    return {
      html: this.clearStringFromFTPandFileLinks(html),
      css: this.clearStringFromFTPandFileLinks(css),
      javascript: this.clearStringFromFTPandFileLinks(javascript)
    };
  }
}