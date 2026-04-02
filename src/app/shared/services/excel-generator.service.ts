import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

interface NamedParameter {
  param_name: string;
  example: string;
}

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  buttons?: any[];
  example?: any;
}

interface WhatsAppTemplate {
  id?: string;
  name: string;
  language: string;
  category: string;
  parameter_format?: 'named';
  status?: string;
  components: TemplateComponent[];
  rejected_reason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExcelGeneratorService {

  constructor() { }

  /**
   * Extract named parameters from template body text
   */
  private extractNamedParameters(bodyText: string): string[] {
    if (!bodyText) return [];
    
    const namedParamRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
    const matches = bodyText.matchAll(namedParamRegex);
    const params: string[] = [];
    
    for (const match of matches) {
      const paramName = match[1];
      if (!params.includes(paramName)) {
        params.push(paramName);
      }
    }
    
    return params;
  }

  /**
   * Get example values from template components
   */
  private getExampleValues(template: WhatsAppTemplate): { [key: string]: string } {
    const bodyComponent = template.components.find(c => c.type === 'BODY');
    const exampleMap: { [key: string]: string } = {};
    
    if (bodyComponent?.example?.body_text_named_params) {
      bodyComponent.example.body_text_named_params.forEach((param: NamedParameter) => {
        exampleMap[param.param_name] = param.example;
      });
    }
    
    return exampleMap;
  }

  /**
   * Generate sample Excel file for a template
   */
  generateTemplateExcel(template: WhatsAppTemplate): void {
    const bodyComponent = template.components.find(c => c.type === 'BODY');
    const bodyText = bodyComponent?.text || '';
    
    // Extract parameters
    const namedParams = this.extractNamedParameters(bodyText);
    const exampleValues = this.getExampleValues(template);
    
    // Build column headers
    const headers = ['phone', ...namedParams];
    
    // Generate sample data rows (3 sample rows)
    const sampleData = this.generateSampleData(namedParams, exampleValues);
    
    // Create worksheet data
    const wsData = [
      headers,
      ...sampleData
    ];
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Format ALL columns as TEXT (apply to 10000 rows to ensure full coverage)
    this.formatColumnsAsText(ws, headers.length + 10000, 10000);
    
    // Set column widths
    const colWidths = headers.map(header => ({ wch: Math.max(15, header.length + 5) }));
    ws['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Template Data');
    
    // Generate filename
    const filename = `${template.name}_sample_data.xlsx`;
    
    // Download file
    XLSX.writeFile(wb, filename);
  }

  /**
   * Format all cells in worksheet as TEXT
   * This applies TEXT format to ALL cells, including empty ones
   */
  private formatColumnsAsText(ws: XLSX.WorkSheet, colCount: number, rowCount: number): void {
    // Get or set the worksheet range
    if (!ws['!ref']) {
      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowCount, c: colCount - 1 } });
    }
    
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // Iterate through ALL cells in the range (including empty ones)
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        
        // Create cell if it doesn't exist
        if (!ws[cellAddress]) {
          ws[cellAddress] = { t: 's', v: '' };
        }
        
        // Set cell format to text
        ws[cellAddress].z = '@';
        ws[cellAddress].t = 's'; // String type
      }
    }
  }

  /**
   * Generate sample data rows
   */
  private generateSampleData(params: string[], exampleValues: { [key: string]: string }): string[][] {
    const sampleRows: string[][] = [];
    
    // Generate 3 sample rows
    for (let i = 1; i <= 3; i++) {
      const row: string[] = [];
      
      // Phone number column
      row.push(`+1555000${1000 + i}`);
      
      // Parameter columns
      params.forEach(param => {
        // Use example value if available, otherwise generate sample
        let value = exampleValues[param];
        
        if (!value) {
          // Generate contextual sample data based on parameter name
          value = this.generateSampleValue(param, i);
        } else {
          // Append row number to differentiate sample rows
          value = `${value}${i > 1 ? ` ${i}` : ''}`;
        }
        
        row.push(value);
      });
      
      sampleRows.push(row);
    }
    
    return sampleRows;
  }

  /**
   * Generate contextual sample values based on parameter name
   */
  private generateSampleValue(paramName: string, rowIndex: number): string {
    const lowerParam = paramName.toLowerCase();
    
    // Customer/User names
    if (lowerParam.includes('name') || lowerParam.includes('customer') || lowerParam.includes('user')) {
      const names = ['John Doe', 'Jane Smith', 'Mike Johnson'];
      return names[rowIndex - 1] || 'Sample Name';
    }
    
    // Order/Transaction IDs
    if (lowerParam.includes('order') || lowerParam.includes('transaction') || lowerParam.includes('id')) {
      return `ORD${10000 + rowIndex}`;
    }
    
    // Dates
    if (lowerParam.includes('date')) {
      const dates = ['Jan 30, 2026', 'Jan 31, 2026', 'Feb 1, 2026'];
      return dates[rowIndex - 1] || 'Jan 30, 2026';
    }
    
    // Times
    if (lowerParam.includes('time')) {
      const times = ['10:00 AM', '2:00 PM', '4:30 PM'];
      return times[rowIndex - 1] || '10:00 AM';
    }
    
    // Amounts/Prices
    if (lowerParam.includes('amount') || lowerParam.includes('price') || lowerParam.includes('total')) {
      return `$${50 + (rowIndex * 25)}.00`;
    }
    
    // Status
    if (lowerParam.includes('status')) {
      const statuses = ['Confirmed', 'Processing', 'Delivered'];
      return statuses[rowIndex - 1] || 'Confirmed';
    }
    
    // Products
    if (lowerParam.includes('product') || lowerParam.includes('item')) {
      const products = ['Product A', 'Product B', 'Product C'];
      return products[rowIndex - 1] || 'Sample Product';
    }
    
    // Locations
    if (lowerParam.includes('location') || lowerParam.includes('address') || lowerParam.includes('city')) {
      const locations = ['New York', 'Los Angeles', 'Chicago'];
      return locations[rowIndex - 1] || 'Sample Location';
    }
    
    // Companies
    if (lowerParam.includes('company') || lowerParam.includes('business')) {
      const companies = ['Acme Corp', 'TechStart Inc', 'Global Ltd'];
      return companies[rowIndex - 1] || 'Sample Company';
    }
    
    // Codes/Coupons
    if (lowerParam.includes('code') || lowerParam.includes('coupon')) {
      return `CODE${1000 + rowIndex}`;
    }
    
    // Links/URLs
    if (lowerParam.includes('link') || lowerParam.includes('url')) {
      return `https://example.com/item/${rowIndex}`;
    }
    
    // Generic fallback
    return `Sample ${paramName} ${rowIndex}`;
  }

  /**
   * Generate Excel with multiple templates (bulk download)
   */
  generateMultipleTemplatesExcel(templates: WhatsAppTemplate[]): void {
    const wb = XLSX.utils.book_new();
    
    templates.forEach(template => {
      const bodyComponent = template.components.find(c => c.type === 'BODY');
      const bodyText = bodyComponent?.text || '';
      
      const namedParams = this.extractNamedParameters(bodyText);
      const exampleValues = this.getExampleValues(template);
      
      const headers = ['phone', ...namedParams];
      const sampleData = this.generateSampleData(namedParams, exampleValues);
      
      const wsData = [headers, ...sampleData];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Format ALL columns as TEXT (apply to 10000 rows)
      this.formatColumnsAsText(ws, headers.length, 10000);
      
      const colWidths = headers.map(header => ({ wch: Math.max(15, header.length + 5) }));
      ws['!cols'] = colWidths;
      
      // Use template name as sheet name (max 31 chars for Excel)
      let sheetName = template.name.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    
    const filename = `whatsapp_templates_sample_data.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  /**
   * Generate empty template Excel (for manual data entry)
   */
  generateEmptyTemplateExcel(template: WhatsAppTemplate, rowCount: number = 10000): void {
    const bodyComponent = template.components.find(c => c.type === 'BODY');
    const bodyText = bodyComponent?.text || '';
    
    const namedParams = this.extractNamedParameters(bodyText);
    const headers = ['phone', ...namedParams];
    
    // Create empty rows
    const emptyData: string[][] = [];
    for (let i = 0; i < rowCount; i++) {
      emptyData.push(new Array(headers.length).fill(''));
    }
    
    const wsData = [headers, ...emptyData];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Format ALL columns as TEXT (apply to actual row count + buffer)
    this.formatColumnsAsText(ws, headers.length, rowCount + 100);
    
    const colWidths = headers.map(header => ({ wch: Math.max(15, header.length + 5) }));
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Template Data');
    
    const filename = `${template.name}_empty_template.xlsx`;
    XLSX.writeFile(wb, filename);
  }
}