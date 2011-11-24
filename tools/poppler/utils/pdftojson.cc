//========================================================================
// pdftojson.cc
//
// Copyright (C) 2010 by Hongliang TIAN(tatetian@gmail.com)
//========================================================================
#include "config.h"
#include <poppler-config.h>
#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>
#include <string.h>
#include <limits.h>
#include <time.h>
#include "parseargs.h"
#include "goo/GooString.h"
#include "goo/gmem.h"
#include "Object.h"
#include "PDFDoc.h"
#include "PDFDocFactory.h"
#include "JsonOutputDev.h"
#include "GlobalParams.h"
#include "Error.h"
#include "DateInfo.h"
#include "goo/gfile.h"

#define PDFTOJSON_VERSION "0.1"

//====================argument parser==========================================
GBool argPrintVersion = gFalse;
GBool argMetaData = gFalse;
char argOwnerPassword[33] = "";
char argUserPassword[33] = "";
int argFirstPage = 1;
int argLastPage = INT_MAX;
GBool argPlainText = gFalse;
const ArgDesc argDesc[] =
{
  {"-p", argFlag, &argPlainText, 0, "output as plain text instead of JSON"},
  {"-f",      argInt,      &argFirstPage,     0,
    "first page to process"},
  {"-l",      argInt,      &argLastPage,      0,
    "last page to process"},
  {"-v", argFlag, &argPrintVersion, 0, "print copyright and version info" },
  {"-m", argFlag, &argMetaData, 0, "output the document meta data in JSON" },
  {"-opw",    argString,   argOwnerPassword,  sizeof(argOwnerPassword),
    "owner password (for encrypted files)"},
  {"-upw",    argString,   argUserPassword,   sizeof(argUserPassword),
    "user password (for encrypted files)"},
  { NULL }
};

//====================helper functions=========================================
static GooString* getInfoString(Dict *infoDict, char *key) {
  Object obj;
  GooString *s1 = NULL;

  if (infoDict->lookup(key, &obj)->isString()) {
    s1 = new GooString(obj.getString());
  }
  obj.free();
  return s1;
}

static GooString* getInfoDate(Dict *infoDict, char *key) {
  Object obj;
  char *s;
  int year, mon, day, hour, min, sec, tz_hour, tz_minute;
  char tz;
  struct tm tmStruct;
  GooString *result = NULL;
  char buf[256];

  if (infoDict->lookup(key, &obj)->isString()) {
    s = obj.getString()->getCString();
    // TODO do something with the timezone info
    if ( parseDateString( s, &year, &mon, &day, &hour, &min, &sec, &tz, &tz_hour, &tz_minute ) ) {
      tmStruct.tm_year = year - 1900;
      tmStruct.tm_mon = mon - 1;
      tmStruct.tm_mday = day;
      tmStruct.tm_hour = hour;
      tmStruct.tm_min = min;
      tmStruct.tm_sec = sec;
      tmStruct.tm_wday = -1;
      tmStruct.tm_yday = -1;
      tmStruct.tm_isdst = -1;
      mktime(&tmStruct); // compute the tm_wday and tm_yday fields
      if (strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S+00:00", &tmStruct)) {
        result = new GooString(buf);
      } else {
        result = new GooString(s);
      }
    } else {
      result = new GooString(s);
    }
  }
  obj.free();
  return result;
}

//====================entry point==============================================
int main(int argc, char *argv[])
{
  // variables
  PDFDoc *doc = NULL;
  GooString *fileName = NULL;
  GooString *docTitle = NULL;
  GooString *author = NULL, *keywords = NULL, *subject = NULL, *date = NULL;
  JsonOutputDev *jsonOut = NULL;
  GBool ok;
  GooString *ownerPW, *userPW;
  Object info;

  const double hDPI = 96.0, vDPI = 96.0 ;

  // parse args
  ok = parseArgs(argDesc, &argc, argv);
  if (!ok || argPrintVersion || argc < 2)
  {
    fprintf(stderr, "pdftojson version %s\n", PDFTOJSON_VERSION);
    fprintf(stderr, "%s\n",
        "Copyright 2011 Hongliang Tian (tatetian@gmail.com)") ;
    fprintf(stderr, "%s\n", popplerCopyright);
    fprintf(stderr, "%s\n",
        "Copyright 1999-2003 Gueorgui Ovtcharov and Rainer Dorsch");
    fprintf(stderr, "%s\n\n", xpdfCopyright);

    printUsage("pdftojson", "<PDF-file> [<JSON-file>]",
          argDesc);
    exit(1);
  }

  // read config file
  globalParams = new GlobalParams();

  // open PDF file
  if (argOwnerPassword[0]) {
    ownerPW = new GooString(argOwnerPassword);
  } else {
    ownerPW = NULL;
  }
  if (argUserPassword[0]) {
    userPW = new GooString(argUserPassword);
  } else {
    userPW = NULL;
  }

  fileName = new GooString(argv[1]);

  doc = PDFDocFactory().createPDFDoc(*fileName, ownerPW, userPW);

  if (userPW) {
    delete userPW;
  }
  if (ownerPW) {
    delete ownerPW;
  }
  if (!doc->isOk()) {
    goto error;
  }

  // check for copy permission
  if (!doc->okToCopy()) {
    error(-1, "Copying of text from this document is not allowed.");
    goto error;
  }
  // get page range
  if (argFirstPage < 1)
    argFirstPage = 1;
  else if (argFirstPage > doc->getNumPages())
    argFirstPage = doc->getNumPages() ;
  if (argLastPage < argFirstPage)
    argLastPage = argFirstPage ;
  else if (argLastPage > doc->getNumPages())
    argLastPage = doc->getNumPages();
  // get meta info
  doc->getDocInfo(&info);
  if (info.isDict()) {
    docTitle = getInfoString(info.getDict(), "Title");
    author = getInfoString(info.getDict(), "Author");
    keywords = getInfoString(info.getDict(), "Keywords");
    subject = getInfoString(info.getDict(), "Subject");
    date = getInfoDate(info.getDict(), "ModDate");
    if( !date )
        date = getInfoDate(info.getDict(), "CreationDate");
  }
  info.free();
  if( !docTitle ) docTitle = fileName->copy();

  // write text file
  /*htmlOut = new HtmlOutputDev(htmlFileName->getCString(),
          docTitle->getCString(),
          author ? author->getCString() : NULL,
          keywords ? keywords->getCString() : NULL,
          subject ? subject->getCString() : NULL,
          date ? date->getCString() : NULL,
          extension,
          rawOrder,
          firstPage,
          doc->getCatalog()->getOutline()->isDict());*/
  jsonOut = new JsonOutputDev() ;
  jsonOut->setAsPlainText(argPlainText);

  if (jsonOut->isOk())
  {

    if(argPlainText) {
      printf("Title: %s\nAuthor: %s\nModDate: %s\n",
          docTitle->getCString(),
          author? author->getCString():"", 
          date? date->getCString():"") ;
    }
    else {
      escapeJsonString(docTitle);
      if(author) escapeJsonString(author);
      printf("{\"doc_id\": \"\", \"title\":\"%s\", \"author\":\"%s\",\"mod_date\":\"%s\",\n",
              docTitle->getCString(), 
              author? author->getCString():"", 
              date? date->getCString():"");
      printf("\"pages\":[\n");
    }

    for(int i = argFirstPage; i <= argLastPage; ++i) {
      if(argPlainText) {
        printf("Page %d:\n", i);
      }
      doc->displayPage(jsonOut, i, hDPI, vDPI,
          0, gTrue, gFalse, gFalse,
          NULL, NULL, NULL, NULL);
      if(!argPlainText) {
        if(i != argLastPage)
          printf(",");
          printf("\n");
      }
    }
    if(!argPlainText)
      printf("]}") ;
  }

  delete jsonOut;

  delete docTitle;
  if( author ) delete author;
  if( keywords ) delete keywords;
  if( subject ) delete subject;
  if( date ) delete date;

  // clean up
 error:
  if(doc) delete doc;
  delete fileName;
  if(globalParams) delete globalParams;

  // check for memory leaks
  Object::memCheck(stderr);
  gMemReport(stderr);

  return 0;
}
