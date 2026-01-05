import "react-native-css-interop/jsx-runtime";
import { Buffer } from "buffer";

if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer;
}
