"use server";
import axios from "axios";
import * as cheerio from "cheerio";
import {extractCurrency, extractDescription, extractPrice } from "../util";
export async function scrapeAmazonProduct(url: string) {
  if (!url) return;

  const username = String(process.env.BRIGHT_DATA_USERNAME);
  const password = String(process.env.BRIGHT_DATA_PASSWORD);
  const port = 22225;
  const session_id = (1000000 * Math.random()) | 0;
  const options = {
    auth: {
      username: `${username}-session-${session_id}`,
      password,
    },
    host: "brd.superproxy.io",
    port,
    rejectUnauthorised: false,
  };
  
  try {
    //fetch the product page
    const response = await axios.get(url, options);
    const $ = cheerio.load(response.data);
    const title = $("#productTitle").text().trim();
    const currentPrice = extractPrice(
      $(".priceToPay span.a-price-whole"),
      $("a.size.base.a-color-price"),
      $(".a-button-selected .a-color-base")
    );
    const orignalPrice = extractPrice(
      $("#priceblock_ourprice"),
      $(".a-price.a-text-price span.a-offscreen"),
      $("#listPrice"),
      $("#priceblock-dealprice"),
      $(".a-size-base.a-color-price")
    );
    const outOfStock =
      $("#availability span").text().trim().toLowerCase() ===
      "currently unavilable";
    const images =
      $("#imgBlkFront").attr("data-a-dynamic-image") ||
      $("#landingImage").attr("data-a-dynamic-image")||'{}';
    
    const imageURls=Object.keys(JSON.parse(images)); 
    const currency=extractCurrency($('.a-price-symbol'));
    const discountRate=$('.savingsPercentage').text().replace(/[-%]/g,"");
    const description=extractDescription($);
    //construct data object with scraped information
    const data = {
      url,
      currency: currency || '$',
      image: imageURls[0],
      title,
      currentPrice: Number(currentPrice) || Number(orignalPrice),
      originalPrice: Number(orignalPrice) || Number(currentPrice),
      priceHistory: [],
      discountRate: Number(discountRate),
      category: 'category',
      reviewsCount:100,
      stars: 4.5,
      isOutOfStock: outOfStock,
      description,
      lowestPrice: Number(currentPrice) || Number(orignalPrice),
      highestPrice: Number(orignalPrice) || Number(currentPrice),
      averagePrice: Number(currentPrice) || Number(orignalPrice),
    }
    return data;
  } catch (error: any) {
    throw new Error(`failed to scrape the product: ${error.message}`);
  }
}
