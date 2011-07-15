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

#define doubleEqual(x, y) ( fabs(x-y) < 0.01 )

void escapeJsonString(GooString* str) {
  for(int i = 0; i < str->getLength(); ++i) {
    switch(str->getChar(i)) {
    case '\"':
    case '\\':
      str->insert(i, '\\');
      ++i ;
      break;
    }
  }
}

ExtractedString::ExtractedString(GfxState *state, double fontSize)
  :RectArea(),
   unicodes(NULL),
   size(0), capacity(1),//TO-DO: figure out why malloc fails when capacity is initialized as 8
   nextStr(NULL),
   x(0), y(0),
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


  unicodes = (Unicode*) gmalloc(sizeof(Unicode)*capacity) ;
}

ExtractedString::ExtractedString(const ExtractedString& another)
  :RectArea(another),
   unicodes(NULL),
   size(another.size), capacity(another.capacity),
   nextStr(NULL),
   x(another.x), y(another.y),
   charAvgSpace(another.charAvgSpace),
   charAvgWidth(another.charAvgWidth)
{
  unicodes = (Unicode*) gmalloc(capacity * sizeof(Unicode));
  memcpy(unicodes, another.unicodes, size * sizeof(Unicode));
}

ExtractedString::~ExtractedString()
{
  gfree(unicodes) ;
}

void ExtractedString::addChar(GfxState *state, double x, double y,
    double dx, double dy, Unicode u)
{
  if (size == capacity) {
    capacity += 16;
    unicodes = (Unicode*) grealloc(unicodes,
        capacity * sizeof(Unicode));
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

  init = true;
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
    unicodes = (Unicode*) grealloc(
        unicodes, sizeof(Unicode) * (newSize+16));
  }
  memcpy(unicodes+size, another.unicodes, sizeof(Unicode) * another.size) ;
  size += another.size;
  capacity = newSize + 16;

  updateBox(another);
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

ExtractedParagraph::ExtractedParagraph()
  : blocks(NULL),
    curBlock(NULL),
    size(0),
    nextPara(NULL)
{
}

ExtractedParagraph::~ExtractedParagraph()
{
}

void ExtractedParagraph::addBlock(ExtractedBlock* block)
{
  if (curBlock) {
    curBlock->setNextBlock(block);
    curBlock = block;
  }
  else {
    blocks = curBlock = block;
  }
  curBlock->setNextBlock(NULL);
  ++size;
}

JsonOutputDev::JsonOutputDev()
  :ok(gTrue), newWord(gTrue), newBlock(gTrue),
   curStr(NULL), strings(NULL),lastStr(NULL), yxCur2(NULL),
   blocks(NULL), paragraphs(NULL), asPlainText(gFalse)
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
  ExtractedParagraph *curPara = NULL, *tmpPara = NULL;

  bool newBlock = true, newString = true, newPara = true;
  for(ExtractedString* curStr=strings;curStr;curStr=curStr->nextStr){
    if (newPara) {
      tmpPara = new ExtractedParagraph();
      if(curPara) {
        curPara->setNextPara(tmpPara);
        curPara = tmpPara;
      }
      else
        paragraphs = curPara = tmpPara;

      curBlock = NULL;
      newPara = false;
    }
    if (newBlock) {
      tmpBlock = new ExtractedBlock();
      if(curBlock) {
        curBlock->setNextBlock(tmpBlock);
        curBlock = tmpBlock ;
      }
      else
        blocks = curBlock = tmpBlock;

      curPara->addBlock(curBlock);
      newBlock = false;
    }
    if (newString) {
      curBlock->addString(*curStr);
      newString = false;
    }
    else {
      curBlock->mergeLastStr(*curStr);
    }
    curPara->updateBox(*curBlock);
    if (curStr->nextStr &&
        doubleEqual(curStr->getY(), curStr->nextStr->getY())) {
      if(areTwoStringSeparate(curStr, curStr->nextStr))
        newString = true;
    }
    else {
      if (curStr->nextStr &&
          ( fabs(curStr->getY() - curStr->nextStr->getY()) > 2* curStr->getHeight() ||
            fabs(curStr->getY() - curStr->nextStr->getY()) > 2* curStr->nextStr->getHeight() ))
        newPara = true;
      newBlock = true;
      newString = true;
    }
  }

  if (asPlainText)
    outputPageAsPlainText();
  else
    outputPageAsJSON();

  clear();
}

void JsonOutputDev::outputPageAsPlainText()
{
  GooString* tmpStr;

  for(ExtractedParagraph* p=paragraphs; p; p=p->getNextPara()) {
    for(ExtractedBlock* b=p->getBlocks(); b; b=b->getNextBlock()) {
      for(ExtractedString *curStr=b->toArray(); curStr; curStr=curStr->getNext()) {
        tmpStr = curStr->toString();
        printf("%s", tmpStr->getCString());
        delete tmpStr;
        if(curStr->getNext())
          printf(" ");
      }
      printf("\n");
    }
    printf("\n");
  }
}

void JsonOutputDev::outputPageAsJSON()
{
  double x, y, w, h;
  double xi, dxi;
  GooString* tmpStr;

  printf("\t{\"pageNum\":%d, \"pageWidth\":%d, \"pageHeight\":%d,\n",
      pageNum, pageWidth, pageHeight);
  printf("\t \"blocks\":[\n");
  for(ExtractedParagraph* p=paragraphs; p; p=p->getNextPara()) {
    p->getPosition(&x, &y);
    p->getBoxSize(&w, &h);
    printf("\t\t{\"l\":%d, \"t\":%d, \"r\":%d, \"b\":%d,\n",
        double2Int(x), double2Int(y), double2Int(x+w), double2Int(y+h));
    printf("\t\t \"lines\":[\n");
    for(ExtractedBlock* b=p->getBlocks(); b; b=b->getNextBlock()) {
      b->getPosition(&x, &y);
      b->getBoxSize(&w, &h);
      printf("\t\t\t{\"l\":%d, \"t\":%d, \"r\":%d, \"b\":%d,\n",
          double2Int(x), double2Int(y), double2Int(x+w), double2Int(y+h));
      printf("\t\t\t\"q\":[");
      for(ExtractedString *curStr=b->toArray(); curStr; curStr=curStr->getNext()) {
        xi = curStr->getXMin();
        dxi = curStr->getXMax() - xi;
        printf("%d, %d", double2Int(xi), double2Int(dxi));
        if(curStr->getNext())
          printf(", ");
      }
      printf("],\n");
      printf("\t\t\t\"s\":[");
      for(ExtractedString *curStr=b->toArray(); curStr; curStr=curStr->getNext()) {
        tmpStr = curStr->toString();
        escapeJsonString(tmpStr);
        printf("\"%s\"", tmpStr->getCString());
        delete tmpStr;
        if(curStr->getNext())
          printf(", ");
      }
      printf("]");
      // debug
      printf(",\n");
      printf("\t\t\t\"ss\":\"");
      for(ExtractedString *curStr=b->toArray(); curStr; curStr=curStr->getNext()) {
        tmpStr = curStr->toString();
        escapeJsonString(tmpStr);
        printf("%s", tmpStr->getCString());
        delete tmpStr;
        if(curStr->getNext())
          printf(" ");
      }
      printf("\"}");
      if(b->getNextBlock()) {
        printf(",\n");
      }
    }
    printf("]}");
    if(p->getNextPara())
      printf(",\n");
  }
  printf("\t]}");
}

bool JsonOutputDev::areTwoStringSeparate(
    ExtractedString* left,
    ExtractedString* right)
{
  double space = right->xMin - left->xMax;
//  if ((left->charAvgSpace && space < 1.2*left->charAvgSpace) ||
//      (right->charAvgSpace && space < 1.2*right->charAvgSpace) ||
//      (space < 0.3*(left->charAvgWidth)) ||
//      (space < 0.3*(right->charAvgWidth)) ) {
//    return false;
//  }
  if ( (space < 0.3 * left->charAvgWidth) ||
       (space < 0.3 * right->charAvgWidth) ) {
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
  for (p1 = strings; p1; p1 = p2) {
    p2 = p1->nextStr;
    delete p1;
  }
  strings = NULL;
  lastStr = yxCur2 = NULL;

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
//  printf("\tendString\n");

  if (curStr->getSize() == 0) {
    delete curStr ;
    curStr = NULL ;
    return ;
  }

  curStr->endString();

  GooString* tmp = curStr->toString();
  delete tmp;

  if (!strings) {
    strings = lastStr = curStr;
  }
  else {
    lastStr->nextStr = curStr;
    lastStr = curStr;
    curStr = NULL;
  }
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
  if (!doubleEqual(curStr->y, y1)){
    fprintf(stderr, "Warning: we have to begin a new string for the new character is not the same line.");

    endString(state);
    beginString(state, NULL) ;
  }

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
