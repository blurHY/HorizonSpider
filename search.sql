select url from main,keywords where keyword like "%aa%" and main.id=keywords.pageid union select url from main,phrases where phrase like "%aa%" and main.id=phrases.pageid