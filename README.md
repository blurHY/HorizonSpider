# HorizonSpider - Nodejs

![](https://img.shields.io/badge/NodeJs-Async-brightgreen.svg) ![](https://img.shields.io/badge/DataBase-NoSQL-blue.svg) ![](https://img.shields.io/badge/License-GPL-orange.svg)

## Basic concepts

The spider crawls each site in `siteList` and submit crawled links to zeronet.

Then zeronet processes them, and downloads those zites.

The crawler continues to traversal `siteList` and crawls newly downloaded sites to get more links

It will store data in mongodb as cache for faster access.

## Usage

Clone this repo and:

```bash
yarn
yarn crawl
```

![](./Horizon.svg)

## Config

Create `.env` file and add configs as follows:

```
ZeroNetPath=D:/ZeroNet
ZeronetDataPath=D:/ZeroNet/Data
feedFull_period=7200000 
feedCheck_period=1800000
optionalFull_period=7200000
optionalCheck_period=1800000
mainLoopInterval=60000
Concurrency=1
```
