# HorizonSpider - Nodejs

![](https://img.shields.io/badge/NodeJs-Async-brightgreen.svg) ![](https://img.shields.io/badge/DataBase-NoSQL-blue.svg) ![](https://img.shields.io/badge/License-GPL-orange.svg)

## Basic concepts

The spider crawls each site in `siteList` and submit crawled links to zeronet.

Then zeronet processes them, and downloads those zites.

It continues to traversal `siteList` and crawls newly downloaded sites to get more links

## Usage

Clone this repo and:

```bash
yarn
```

### Config

Create `.env` file and add configs as follows:

```
ZeroNetPath=D:/ZeroNet
ZeronetDataPath=D:/ZeroNet/Data
```

# Run

```bash
yarn crawl
```

