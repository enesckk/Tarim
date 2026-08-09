// @ts-nocheck
import type { Request, Response, NextFunction } from 'express';
import { FinalReportService } from '../services/final-report.service.js';

export class FinalReportController {
  private readonly service = new FinalReportService();

  getReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parcelId = req.params.parcelId as string;
      const report = await this.service.generateReport(parcelId);
      res.json(report);
    } catch (error) {
      next(error);
    }
  };

  getReportJson = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parcelId = req.params.parcelId as string;
      const report = await this.service.generateReport(parcelId);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="report-${parcelId}.json"`);
      res.json(report);
    } catch (error) {
      next(error);
    }
  };

  getReportHtml = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parcelId = req.params.parcelId as string;
      const report = await this.service.generateReport(parcelId);
      
      const html = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Tarım AI Analysis Report</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 1000px; margin: 0 auto; padding: 20px; }
            h1, h2, h3 { color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .badge-success { background: #d4edda; color: #155724; }
            .badge-warning { background: #fff3cd; color: #856404; }
            .badge-danger { background: #f8d7da; color: #721c24; }
            .card { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ddd; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
            th { background: #f4f4f4; }
            .header-meta { color: #666; font-size: 0.9em; margin-bottom: 30px; }
          </style>
        </head>
        <body>
          <h1>Tarım AI Final Analysis Report</h1>
          <div class="header-meta">
            <p><strong>Report ID:</strong> ${report.reportId}</p>
            <p><strong>Parcel ID:</strong> ${report.parcelId}</p>
            <p><strong>Generated At:</strong> ${new Date(report.generatedAt).toLocaleString('tr-TR')}</p>
          </div>

          <h2>Executive Summary</h2>
          <div class="card">
            <p><strong>Overall Status:</strong> ${report.executiveSummary.overallStatus}</p>
            <p><strong>Total Crops Evaluated:</strong> ${report.executiveSummary.totalCropsEvaluated}</p>
            <p><strong>Recommended Seasonal Crops:</strong> ${report.executiveSummary.recommendedSeasonalCrops}</p>
            <p><strong>Recommended Perennial Crops:</strong> ${report.executiveSummary.recommendedPerennialCrops}</p>
            <p><strong>Overall Confidence:</strong> ${report.executiveSummary.overallConfidence}</p>
          </div>

          <h2>Seasonal Crop Ranking (Top 10)</h2>
          <table>
            <thead>
              <tr><th>Rank</th><th>Crop</th><th>Suitability</th><th>Confidence</th><th>Explainability</th></tr>
            </thead>
            <tbody>
              ${report.seasonalRanking.map(r => `
                <tr>
                  <td>#${r.rank}</td>
                  <td><strong style="text-transform: capitalize;">${r.cropName}</strong></td>
                  <td>${r.suitability}</td>
                  <td>${r.confidence}</td>
                  <td style="font-size: 0.9em; font-style: italic;">${r.explainabilitySummary}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h2>Perennial Crop Ranking (Top 10)</h2>
          <table>
            <thead>
              <tr><th>Rank</th><th>Crop</th><th>Suitability</th><th>Confidence</th><th>Explainability</th></tr>
            </thead>
            <tbody>
              ${report.perennialRanking.map(r => `
                <tr>
                  <td>#${r.rank}</td>
                  <td><strong style="text-transform: capitalize;">${r.cropName}</strong></td>
                  <td>${r.suitability}</td>
                  <td>${r.confidence}</td>
                  <td style="font-size: 0.9em; font-style: italic;">${r.explainabilitySummary}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      next(error);
    }
  };

  getReportPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(501).json({ 
        message: 'PDF export is not implemented yet. The data model is ready, but a PDF generation library (like Puppeteer or jsPDF) is required.',
        status: 501
      });
    } catch (error) {
      next(error);
    }
  };
}
