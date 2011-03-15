  /*
 * JsonOutputDev.cpp
 *
 *  Created on: Mar 15, 2011
 *      Author: tian
 */

#include <math.h>
#include <assert.h>
#include "JsonOutputDev.h"
#include "GfxFont.h"
#include "UTF8.h"

#define double2Int(x) ((int)(x + 0.5))
#ifndef max
#define max(a,b) ( ((a)>(b))?(a):(b) )
#endif
#ifndef min
#define min(a,b) ( ((a)<(b))?(a):(b) )
#endif


ExtractedString::ExtractedString(GfxState *state, double fontSize)
  :unicodes(NULL),
   size(0), capacity(0),
   yxNext(NULL),
   x(0), y(0),
   xMin(0), xMax(0), yMin(0), yMax(0),
   charAvgSpace(0),charAvgWidth(0)
{
  GfxFont *font = state->getFont();
  assert(font != NULL); //this should never happen

  state->transform(state->getCurX(), state->getCurY(), &x, &y);

  double ascent = font->getAscent();
  double descent = font->getDescent();
  if( ascent > 1.05 ){
      ascent = 1.05;
  }
  if( descent < -0.4 ){
      descent = -0.4;
  }
  yMin = y - ascent * fontSize ;
  yMax = y - descent * fontSize ;
}

ExtractedString::ExtractedString(const ExtractedString& another)
  :unicodes(NULL),
   size(another.size), capacity(another.capacity),
   yxNext(NULL),
   x(another.x), y(another.y),
   xMin(another.xMin),
   xMax(another.xMax),
   yMin(another.yMin),
   yMax(another.yMax),
   charAvgSpace(another.charAvgSpace),
   charAvgWidth(another.charAvgWidth)
{
  if(another.unicodes == NULL || capacity == 0)
    return;
  unicodes = new Unicode[capacity] ;
  //unicodes = (Unicode*) gmalloc(capacity * sizeof(Unicode));
  memcpy(unicodes, another.unicodes, size * sizeof(Unicode));
}

ExtractedString::~ExtractedString()
{
  //gfree(unicodes) ;
  delete [] unicodes;
}

void ExtractedString::addChar(GfxState *state, double x, double y,
    double dx, double dy, Unicode u)
{
  if (size == capacity) {
    Unicode* tmp;
    capacity += 16;
    //unicodes = (Unicode*) grealloc(unicodes,
    //    capacity * sizeof(Unicode));
    tmp = new Unicode[capacity];
    memcpy(tmp, unicodes, sizeof(Unicode)*size);
    if(unicodes) delete [] unicodes;
    unicodes = tmp;
  }
  unicodes[size] = u;
  if (size == 0) {
    this->x = x;
    this->y = y;
    xMin = x;
  }
  if (size > 0)
    charAvgSpace += (x - xMax);
  xMax = x + dx;
  charAvgWidth += dx;
  ++size ;
}

GooString* ExtractedString::toString() const
{
  GooString* str = new GooString();
  char buff[4];
  int n;

  for (int i = 0; i < size; ++i) {
    if((n = mapUTF8(unicodes[i], buff, 4) ) > 0 )
      str->append(buff, n);
  }
  return str;
}

void ExtractedString::endString()
{
  if(size>1) {
    charAvgSpace /= size;
    charAvgWidth /= size;
  }
}

void ExtractedString::append(const ExtractedString& another)
{
  int newSize = size + another.size;
  if (capacity < newSize) {
    //unicodes = (Unicode*) grealloc(
    //    unicodes, sizeof(Unicode) * (newSize+16));
    Unicode* tmp = new Unicode[newSize+16];
    memcpy(tmp, unicodes, sizeof(Unicode)*size);
    delete [] unicodes;
    unicodes = tmp;
  }
  memcpy(unicodes+size, another.unicodes, sizeof(Unicode) * another.size) ;
  size += another.size;
  capacity = newSize + 16;
}

ExtractedBlock::ExtractedBlock()
  :strings(NULL),
   nextBlock(NULL),
   curStr(NULL),
   size(0)
{

}

ExtractedBlock::~ExtractedBlock()
{
  ExtractedString *s1, *s2;
  for(s1 = strings; s1; s1 = s2) {
    s2 = s1->getNext();
    delete s1;
  }
}

void ExtractedBlock::addString(const ExtractedString& str)
{
  ExtractedString* tmp = new ExtractedString(str);
  if(curStr) {
    curStr->setNext(tmp);
    curStr = tmp;
  }
  else {
    strings = curStr = tmp;
  }
  updateBox(str);
  ++ size;
}

void ExtractedBlock::mergeLastStr(const ExtractedString& str)
{
  if(curStr)
    curStr->append(str);
  else
    strings = curStr = new ExtractedString(str);
  updateBox(str);
}

void ExtractedBlock::updateBox(const ExtractedString& str)
{
  if(size) {
    xMin = min(xMin, str.getXMin());
    xMax = max(xMax, str.getXMax());
    yMin = min(yMin, str.getYMin());
    yMax = max(yMax, str.getYMax());
  }
  else {
    xMin = str.getXMin();
    xMax = str.getXMax();
    yMin = str.getYMin();
    yMax = str.getYMax();
  }
}

JsonOutputDev::JsonOutputDev()
  :newWord(gTrue), newBlock(gTrue),
   curStr(NULL), yxStrings(NULL),yxCur1(NULL), yxCur2(NULL),
   ok(gTrue)
{
}

JsonOutputDev::~JsonOutputDev()
{
}

void JsonOutputDev::startPage(int pageNum, GfxState *state) {
  this->pageNum = pageNum;

  this->pageWidth=static_cast<int>(state->getPageWidth());
  this->pageHeight=static_cast<int>(state->getPageHeight());

//  printf("startPage: pageNum=%d, pageWidth=%d, pageHeight=%d\n",
//      pageNum, this->pageWidth, this->pageHeight) ;
}

void JsonOutputDev::endPage() {
//  printf("endPage\n") ;

  // word segmentation and line formation
  // each line is represented by ExtractedBlock
  // each word is represented by ExtractedString
  ExtractedBlock *curBlock = NULL, *tmpBlock = NULL;
  bool newBlock = true, newString = true;
  for(ExtractedString* curStr=yxStrings;curStr;curStr=curStr->yxNext){
    if (newBlock) {
      tmpBlock = new ExtractedBlock();
      if(curBlock) {
        curBlock->setNextBlock(tmpBlock);
        curBlock = tmpBlock ;
      }
      else
        blocks = curBlock = tmpBlock;

      newBlock = false;
    }
    if (newString) {
      curBlock->addString(*curStr);
      newString = false;
    }
    else {
      curBlock->mergeLastStr(*curStr);
    }
    if (curStr->yxNext && curStr->yxNext->yMin==curStr->yMin) {
      if(areTwoStringSeparate(curStr, curStr->yxNext))
        newString = true;
    }
    else {
      newBlock = true;
      newString = true;
    }
  }

  outputPageAsJSON();

  clear();
}

void JsonOutputDev::outputPageAsJSON()
{
  double x, y, w, h;
  double xi, dxi;
  GooString* tmpStr;

  printf("\t{\n");
  printf("\tpageNum:%d, pageWidth:%d, pageHeight:%d,\n",
      pageNum, pageWidth, pageHeight);
  printf("\tblocks:[\n");
  for(ExtractedBlock* b=blocks; b; b=b->getNextBlock()) {
    b->getPosition(&x, &y);
    b->getBoxSize(&w, &h);
    printf("\t\t{\n");
    printf("\t\t\tx:%d, y:%d, w:%d, h:%d,\n",
        double2Int(x), double2Int(y), double2Int(w), double2Int(h));
    printf("\t\t\tq:[");
    for(ExtractedString *curStr=b->toArray(); curStr; curStr=curStr->getNext()) {
      xi = curStr->getXMin();
      dxi = curStr->getXMax() - xi;
      printf("%d, %d", double2Int(xi), double2Int(dxi));
      if(curStr->getNext())
        printf(", ");
    }
    printf("],\n");
    printf("\t\t\tt:[");
    for(ExtractedString *curStr=b->toArray(); curStr; curStr=curStr->getNext()) {
      tmpStr = curStr->toString();
      printf("\"%s\"", tmpStr->getCString());
      delete tmpStr;
      if(curStr->getNext())
        printf(", ");
    }
    printf("]\n");
    printf("\t\t}\n");
  }
  printf("\t]");
  printf("\t}\n");
}

bool JsonOutputDev::areTwoStringSeparate(
    ExtractedString* left,
    ExtractedString* right)
{
  double space = right->xMin - left->xMax;
  if ((left->charAvgSpace && space < 1.2*left->charAvgSpace) ||
      (right->charAvgSpace && space < 1.2*right->charAvgSpace) ||
      (space < 0.3*(left->charAvgWidth)) ||
      (space < 0.3*(right->charAvgWidth)) ) {
    return false;
  }
  else {
    return true;
  }
}
void JsonOutputDev::clear() {
  ExtractedString *p1, *p2;
  ExtractedBlock *b1, *b2;

  if (curStr) {
    delete curStr;
    curStr = NULL;
  }
  for (p1 = yxStrings; p1; p1 = p2) {
    p2 = p1->yxNext;
    delete p1;
  }
  yxStrings = NULL;
  yxCur1 = yxCur2 = NULL;

  for (b1 = blocks; b1; b1 = b2) {
    b2 = b1->getNextBlock();
    delete b1;
  }
}

void JsonOutputDev::updateFont(GfxState *state) {
  GfxFont *font;
  double *fm;
  char *name;
  int code;
  double w;

  font = state->getFont() ;

//  printf("\tupdateFont: state=%d, fontOrigName=%s\n",
//      state, font!=NULL?font->getOrigName()->getCString():"NaN");

  // get the font size
  fontSize = state->getTransformedFontSize();
  if ((font = state->getFont()) && font->getType() == fontType3) {
    // This is a hack which makes it possible to deal with some Type 3
    // fonts.  The problem is that it's impossible to know what the
    // base coordinate system used in the font is without actually
    // rendering the font.  This code tries to guess by looking at the
    // width of the character 'm' (which breaks if the font is a
    // subset that doesn't contain 'm').
    for (code = 0; code < 256; ++code) {
      if ((name = ((Gfx8BitFont *)font)->getCharName(code)) &&
          name[0] == 'm' && name[1] == '\0') {
        break;
      }
    }
    if (code < 256) {
      w = ((Gfx8BitFont *)font)->getWidth(code);
      if (w != 0) {
        // 600 is a generic average 'm' width -- yes, this is a hack
        fontSize *= w / 0.6;
      }
    }
    fm = font->getFontMatrix();
    if (fm[0] != 0) {
      fontSize *= fabs(fm[3] / fm[0]);
    }
  }
}

void JsonOutputDev::beginString(GfxState *state, GooString *s) {
//  printf("\tbeginString: state=%d, s=%s\n", state, s!=NULL?s->getCString():"") ;
  curStr = new ExtractedString(state, fontSize);
}

void JsonOutputDev::endString(GfxState *state) {
  ExtractedString *p1=NULL, *p2=NULL;
  double h, y1, y2;

//  printf("\tendString\n");

  if (curStr->getSize() == 0) {
    delete curStr ;
    curStr = NULL ;
    return ;
  }

  curStr->endString();

  // insert string in y-major list
  h = curStr->yMax - curStr->yMin;
  y1 = curStr->yMin + 0.5 * h;
  y2 = curStr->yMin + 0.8 * h;
  if ((!yxCur1 || (y1 >= yxCur1->yMin && (y2 >= yxCur1->yMax
      || curStr->xMax >= yxCur1->xMin))) && (!yxCur2 || (y1 < yxCur2->yMin
      || (y2 < yxCur2->yMax && curStr->xMax < yxCur2->xMin))))
  {
    p1 = yxCur1;
    p2 = yxCur2;
  }
  else
  {
    for (p1 = NULL, p2 = yxStrings; p2; p1 = p2, p2 = p2->yxNext)
    {
      if (y1 < p2->yMin || (y2 < p2->yMax && curStr->xMax < p2->xMin))
        break;
    }
    yxCur2 = p2;
  }
  yxCur1 = curStr;
  if (p1)
    p1->yxNext = curStr;
  else
    yxStrings = curStr;
  curStr->yxNext = p2;
  curStr = NULL;
}

void JsonOutputDev::drawChar(GfxState *state, double x, double y,
              double dx, double dy,
              double originX, double originY,
              CharCode code, int /*nBytes*/, Unicode *u, int uLen)
{
  double x1, y1, w1, h1, dx2, dy2;
  state->transform(x, y, &x1, &y1);

//  printf("\t\tdrawChar: state=%d, x=%d, y=%d\n",
//      state, double2Int(x1), double2Int(y1)) ;

  // if it is hidden, then return
  if ((state->getRender() & 3) == 3)
    return ;

  // begin a new string if
  // 1) not on the same line
  // TODO: what about too far away?
  if (curStr->y != y1)
    beginString(state, NULL) ;

  // TODO: have a better understanding of the following lines
  state->textTransformDelta(state->getCharSpace() * state->getHorizScaling(),
      0, &dx2, &dy2) ;
  dx -= dx2;
  dy -= dy2;
  state->transformDelta(dx, dy, &w1, &h1);
  if (uLen != 0) {
    w1 /= uLen;
    h1 /= uLen;
  }

  for (int i = 0; i < uLen; ++i) {
    curStr->addChar(state, x1 + i*w1, y1 + i*h1, w1, h1, u[i]);
  }
}
