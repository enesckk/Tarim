import { TkgmProviderService } from './src/modules/parcel/services/tkgm-provider.service.js';
const tkgm = new TkgmProviderService();
async function test() {
  try {
    const provinceId = await tkgm.findProvinceId('Hatay');
    const districtId = await tkgm.findDistrictId(provinceId, 'Defne');
    const neighborhoodId = await tkgm.findNeighborhoodId(districtId, 'Güngürge');
    const feature = await tkgm.fetchParcelFeature(neighborhoodId, '108', '7');
    console.log('Feature:', feature ? 'Found' : 'Not Found');
  } catch(e) {
    console.error(e.message);
  }
}
test();
