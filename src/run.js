
import Shopify from 'shopify-api-node'
import csv from 'csvtojson'
import request from 'request';
import axios from 'axios';
import { config } from "dotenv";

if (process.env.NODE_ENV !== "production") {
  config();
}


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

      if (allProducts?.length >= max) {
        resolve(allProducts)  
        return
      }/**/
      await new Promise(resolve => setTimeout(resolve, 500))
    } while (params !== undefined);


    resolve(allProducts)
  })
}

const getXentralData = () => {
  return new Promise(async (resolve, reject) => {
    let urlCsvFile = process.env.URL

    resolve(axios.get(urlCsvFile)
    .then(response => {
      // Stelle sicher, dass die Antwort im Textformat ist
      const csvData = response.data;
      return csv({
        delimiter: ';'
      }).fromString(csvData);
    })
    .catch(error => {
      console.error('Es gab einen Fehler beim Herunterladen oder Verarbeiten der CSV:', error);
    }));
  })

}

const run = async () => {

  console.log("Lade Xentral Daten von URL...")
  const xentralData = await getXentralData()
  console.log("Xentral Daten:", xentralData.length)

  let shopifyConfig = {
    shopName: process.env.SHOP_NAME,
    apiKey: process.env.API_KEY,
    password: process.env.PASSWORD,
    apiVersion: process.env.API_VERSION,
    autoLimit: true
  }
  shopify = new Shopify(shopifyConfig)


  console.log("Lade Shopify Produkte...")
  const allProducts = await getShopifyProducts()
  console.log("Shopify Produkte:", allProducts.length)

  const inventoryItemIds = allProducts.map(product => product.variants.map(variant => variant.inventory_item_id)) 
  const allInventoryItems = []
  console.log("Lade Shopify Inventory Items...")
  for (let i = 0; i < allProducts.length; i += 100) {
    const items = inventoryItemIds.slice(i, i + 100)

    const inventoryItems = await shopify.inventoryItem.list({ids: items.join(',')})
    allInventoryItems.push(...inventoryItems)
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  console.log("Shopify Inventory Items:", allInventoryItems.length)

  let count = 0
  console.log("Aktualisiere Einkaufspreise...")
  for (const item of allInventoryItems) {
    let {sku, cost} = item
    const wawiData = xentralData.find(data => data['Variant SKU']?.toLowerCase() === sku?.toLowerCase())

    if (wawiData) {
      let {'Variant Cost': wawiCost} = wawiData
      wawiCost = parseFloat(wawiCost.replace(',', '.'))
      wawiCost = Math.round(wawiCost * 100) / 100

      cost = parseFloat(cost)
      cost = Math.round(cost * 100) / 100

      if (wawiCost != cost) {
        count++
        console.log("Aktualisiere Einkaufspreise für Produkt", sku, "von", cost, "auf", wawiCost)

        await shopify.inventoryItem.update(item.id, {cost}).catch(err => {
          console.error("FEHLER beim Aktualisieren des Preises für das Produkt", sku)
          console.error(err)
        });

        // wait 500 ms
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  }
  console.log("Aktualisierte Einkaufspreise:", count)
  console.log("Fertig")
}

setTimeout(run, 1000)
