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
#include <limits>

#define double2Int(x) ((int)(x + 0.5))
#ifndef max
#define max(a,b) ( ((a)>(b))?(a):(b) )
#endif
#ifndef min
#define min(a,b) ( ((a)<(b))?(a):(b) )
#endif

void escapeJsonString(GooString* str) ;

class RectArea {
public:
  RectArea()
    :xMin(0), xMax(0),
     yMin(0), yMax(0),
     init(false)
  {}
  RectArea(const RectArea& another)
    : xMin(another.xMin),
      xMax(another.xMax),
      yMin(another.yMin),
      yMax(another.yMax),
      init(another.init)
  {}
  virtual ~RectArea() {}
  double getXMin() const {return xMin;}
  double getXMax() const {return xMax;}
  double getYMin() const {return yMin;}
  double getYMax() const {return yMax;}

  virtual void updateBox(const RectArea& area) {
    if(init) {
      xMin = min(xMin, area.getXMin());
      xMax = max(xMax, area.getXMax());
      yMin = min(yMin, area.getYMin());
      yMax = max(yMax, area.getYMax());
    }
    else {
      xMin = area.xMin;
      xMax = area.xMax;
      yMin = area.yMin;
      yMax = area.yMax;
      init = true;
    }
  }
protected:
  double xMin, xMax, yMin, yMax;
  bool init;
};

class ExtractedString : public RectArea
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
  double getCharAvgSpace() const {return charAvgSpace;}
  double getCharAvgWidth() const {return charAvgWidth;}
  double getHeight() const {return yMax-yMin;}
  ExtractedString* getNext() {return nextStr;}
  void setNext(ExtractedString* next) {nextStr=next;}
private:
  Unicode *unicodes;
  int size;
  int capacity;
  ExtractedString* nextStr;
  double x, y;
  double charAvgSpace;
  double charAvgWidth;

  friend class JsonOutputDev;
};

class ExtractedBlock : public RectArea
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
  ExtractedString* strings;
  ExtractedBlock* nextBlock;
  ExtractedString* curStr;
  int size;
} ;


class ExtractedParagraph : public RectArea
{
public:
  ExtractedParagraph();
  ~ExtractedParagraph();

  void addBlock(ExtractedBlock* block);
  ExtractedBlock* getBlocks() const {return blocks;}
  int getSize() const {return size;}
  void setNextPara(ExtractedParagraph* next) {nextPara=next;}
  ExtractedParagraph* getNextPara() const {return nextPara;}

  void getPosition(double* x, double* y) {*x=xMin; *y=yMin;};
  void getBoxSize(double* width, double* height) {*width=xMax-xMin;*height=yMax-yMin;};
private:
  ExtractedBlock* blocks;
  ExtractedBlock* curBlock;
  int size;

  ExtractedParagraph* nextPara;
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

  void setAsPlainText(GBool b) {
    asPlainText = b;
  }
private:
  void clear();
  bool areTwoStringSeparate(ExtractedString* left,
                            ExtractedString* right);
  void outputPageAsPlainText();
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
  ExtractedString *strings, *lastStr, *yxCur2;

  ExtractedBlock *blocks;
  ExtractedParagraph *paragraphs;

  GBool asPlainText ;
};

#endif /* JSONOUTPUTDEV_H_ */
