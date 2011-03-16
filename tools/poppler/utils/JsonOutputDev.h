/*
 * JsonOutputDev.h
 *
 *  Created on: Mar 15, 2011
 *      Author: tian
 */

#ifndef JSONOUTPUTDEV_H_
#define JSONOUTPUTDEV_H_

#include "OutputDev.h"
#include "GfxState.h"
#include "CharTypes.h"
#include "Stream.h"
#include "Array.h"
#include "Dict.h"
#include "XRef.h"
#include "Catalog.h"
#include "Page.h"
#include "gtypes.h"

void escapeJsonString(GooString* str) ;

class ExtractedString
{
public:
  ExtractedString(GfxState *state, double fontSize);
  ExtractedString(const ExtractedString& another);
  ~ExtractedString();
  // Add a character to the string.
  void addChar(GfxState *state, double x, double y,
               double dx, double dy,
               Unicode u);
  void endString(); // postprocessing
  void append(const ExtractedString& another) ;
  GooString* toString() const;
  int getSize() const {return size;}
  double getX() const {return x;}
  double getY() const {return y;}
  double getXMin() const {return xMin;}
  double getXMax() const {return xMax;}
  double getYMin() const {return yMin;}
  double getYMax() const {return yMax;}
  double getCharAvgSpace() const {return charAvgSpace;}
  double getCharAvgWidth() const {return charAvgWidth;}
  ExtractedString* getNext() {return yxNext;}
  void setNext(ExtractedString* next) {yxNext=next;}
private:
  double x, y;
  double yMin, yMax, xMin, xMax ;
  double charAvgSpace;
  double charAvgWidth;

  Unicode *unicodes;
  int size;
  int capacity;

  ExtractedString* yxNext;

  friend class JsonOutputDev;
};

class ExtractedBlock
{
public:
  ExtractedBlock();
  ~ExtractedBlock();

  void addString(const ExtractedString& str);
  void mergeLastStr(const ExtractedString& str);

  ExtractedBlock* getNextBlock() {return nextBlock;}
  void setNextBlock(ExtractedBlock* b) {nextBlock = b;}

  void getPosition(double* x, double* y) {*x=xMin; *y=yMin;};
  void getBoxSize(double* width, double* height) {*width=xMax-xMin;*height=yMax-yMin;};

  ExtractedString* toArray() {return strings;}
private:
  void updateBox(const ExtractedString& str);

  int size;
  double xMin, xMax, yMin, yMax;

  ExtractedString* strings;
  ExtractedString* curStr;

  ExtractedBlock* nextBlock;
} ;


class JsonOutputDev : public OutputDev
{
public:
  JsonOutputDev();
  virtual ~JsonOutputDev();

  // Check if file was successfully created.
  virtual GBool isOk() { return ok; }

  //---- get info about output device

  // Does this device use upside-down coordinates?
  // (Upside-down means (0,0) is the top left corner of the page.)
  virtual GBool upsideDown() { return gTrue; }

  // Does this device use drawChar() or drawString()?
  virtual GBool useDrawChar() { return gTrue; }

  // Does this device use beginType3Char/endType3Char?  Otherwise,
  // text in Type 3 fonts will be drawn with drawChar/drawString.
  virtual GBool interpretType3Chars() { return gFalse; }

  // Does this device need non-text content?
  virtual GBool needNonText() { return gFalse; }

  //----- initialization and control

  virtual GBool checkPageSlice(Page *page, double hDPI, double vDPI,
                               int rotate, GBool useMediaBox, GBool crop,
                               int sliceX, int sliceY, int sliceW, int sliceH,
                               GBool printing, Catalog * catalogA,
                               GBool (* abortCheckCbk)(void *data) = NULL,
                               void * abortCheckCbkData = NULL)
  {
    docPage = page;
    catalog = catalogA;
    return gTrue;
  }


  // Start a page.
  virtual void startPage(int pageNum, GfxState *state);

  // End a page.
  virtual void endPage();

  //----- update text state
  virtual void updateFont(GfxState *state);

  //----- text drawing
  virtual void beginString(GfxState *state, GooString *s);
  virtual void endString(GfxState *state);
  virtual void drawChar(GfxState *state, double x, double y,
                        double dx, double dy,
                        double originX, double originY,
                        CharCode code, int nBytes, Unicode *u, int uLen);
private:
  void clear();
  bool areTwoStringSeparate(ExtractedString* left,
                            ExtractedString* right);
  void outputPageAsJSON();

  GBool ok;                    // set up ok?
  Catalog *catalog;
  Page *docPage;

  // page info
  int pageNum ;
  int pageWidth ;
  int pageHeight ;

  double fontSize ;
  //
  GBool newWord ;
  GBool newBlock ;

  ExtractedString *curStr;
  ExtractedString *yxStrings, *yxCur1, *yxCur2;

  ExtractedBlock *blocks;
};

#endif /* JSONOUTPUTDEV_H_ */
