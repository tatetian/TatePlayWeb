/*
 * JsonOutputDev.h
 *
 *  Created on: Mar 15, 2011
 *      Author: tian
 */

#ifndef JSONOUTPUTDEV_H_
#define JSONOUTPUTDEV_H_

#include "OutputDev.h"

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

private:
  GBool ok;                    // set up ok?
};

#endif /* JSONOUTPUTDEV_H_ */
