import { FinalReportService } from './src/modules/final-report/services/final-report.service.js';

async function runE2E() {
  console.log('--- STARTING E2E TEST PIPELINE ---');
  const service = new FinalReportService();

  console.log('Running analysis for Parcel: p1 (Sinan, Ada 0, Parsel 1513)');
  const report1 = await service.generateReport('p1');
  console.log(`Report ID: ${report1.reportId}, Status: ${report1.executiveSummary.overallStatus}`);
  console.log(`Top Seasonal: ${report1.seasonalRanking[0]?.cropName}`);
  console.log(`Top Perennial: ${report1.perennialRanking[0]?.cropName}`);

  console.log('\\nRunning analysis for Parcel: p2 (Güngürge, Ada 108, Parsel 7)');
  const report2 = await service.generateReport('p2');
  console.log(`Report ID: ${report2.reportId}, Status: ${report2.executiveSummary.overallStatus}`);
  console.log(`Top Seasonal: ${report2.seasonalRanking[0]?.cropName}`);
  console.log(`Top Perennial: ${report2.perennialRanking[0]?.cropName}`);
  
  console.log('\\n--- E2E PIPELINE PASSED ---');
}

runE2E().catch(console.error);
