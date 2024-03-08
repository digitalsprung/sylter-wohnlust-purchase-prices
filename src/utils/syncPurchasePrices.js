
import Shopify from 'shopify-api-node'
import csv from 'csvtojson'
import request from 'request';
import axios from 'axios';


let shopify = null
let max = 1000000000

const getShopifyProducts = () => {
  return new Promise(async (resolve, reject) => {
    let params = { limit: 250 };
    let allProducts = []
    do {
      const products = await shopify.product.list(params).catch(err => {
        console.error(err.toString())
        reject(err)
      });
  
      allProducts = [...allProducts, ...products]

      params = products.nextPageParameters;

      console.log("PRODUCTS", allProducts?.length)
      if (allProducts?.length >= max) {
        resolve(allProducts)  
        return
      }/**/
      await new Promise(resolve => setTimeout(resolve, 500))
    } while (params !== undefined);


    resolve(allProducts)
  })
}

const run = () => {

  let urlCsvFile = process.env.URL

  // read csv data from url

  

  axios.get(urlCsvFile)
  .then(response => {
    // Stelle sicher, dass die Antwort im Textformat ist
    const csvData = response.data;
    return csv({
      delimiter: ';'
    }).fromString(csvData);
  })
  .then(jsonObj => {
    console.log(jsonObj);
  })
  .catch(error => {
    console.error('Es gab einen Fehler beim Herunterladen oder Verarbeiten der CSV:', error);
  });


  let shopifyConfig = {
    shopName: process.env.SHOP_NAME,
    apiKey: process.env.API_KEY,
    password: process.env.PASSWORD,
    apiVersion: process.env.API_VERSION,
    autoLimit: true
  }
  shopify = new Shopify(shopifyConfig)

  
  return new Promise(async (resolve, reject) => {
    const allProducts = await getShopifyProducts()
    
    console.log("allProducts", allProducts.length)
  })
}


export default run;
