import nunjucks from 'nunjucks';

export class TemplateEngine {
  private env: nunjucks.Environment;

  constructor() {
    // Configure Nunjucks (similar to Twig)
    // No loader required when rendering strings directly
    this.env = new nunjucks.Environment(undefined, {
      autoescape: false // Match Twig behavior
    });
  }

  /**
   * Render template with data array (multiple PDFs)
   * Matches original Twig rendering logic
   */
  async renderMultiple(template: string, dataArray: Array<Record<string, any>>): Promise<string> {
    let totalCombined = '';
    
    for (const data of dataArray) {
      const rendered = this.env.renderString(template, data);
      totalCombined += rendered;
    }
    
    return totalCombined;
  }

  /**
   * Render template without data
   */
  async renderSingle(template: string, data: Record<string, any> = {}): Promise<string> {
    return this.env.renderString(template, data);
  }

  /**
   * Main render method - decides single vs multiple
   */
  async render(template: string, data?: Array<Record<string, any>>): Promise<string> {
    if (data && Array.isArray(data) && data.length > 0) {
      return this.renderMultiple(template, data);
    }
    return this.renderSingle(template);
  }
}