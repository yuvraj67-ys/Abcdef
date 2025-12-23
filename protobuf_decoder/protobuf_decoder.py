# --- START OF FILE protobuf_decoder.py ---
import struct
import base64
import json

class Parser:
    def __init__(self):
        self.result = {}

    def parse(self, buffer):
        self.buffer = buffer
        self.pos = 0
        return self.read_message()

    def read_message(self):
        result = {}
        while self.pos < len(self.buffer):
            # Read tag (field number and wire type)
            if self.pos >= len(self.buffer):
                break
                
            tag = self.read_varint()
            field_number = tag >> 3
            wire_type = tag & 0x07

            if wire_type == 0:  # Varint
                value = self.read_varint()
                self._add_field(result, field_number, value)
            elif wire_type == 1:  # 64-bit
                value = self.read_fixed64()
                self._add_field(result, field_number, value)
            elif wire_type == 2:  # Length-delimited (String, Bytes, Embedded Message)
                length = self.read_varint()
                value = self.buffer[self.pos:self.pos + length]
                self.pos += length
                
                # Try to decode as string or nested message
                decoded = None
                try:
                    # Try recursive parse (nested message)
                    sub_parser = Parser()
                    sub_parser.buffer = value
                    sub_parser.pos = 0
                    decoded = sub_parser.read_message()
                    # If empty dict, it might be just a string
                    if not decoded and length > 0: 
                        decoded = value.decode('utf-8')
                except:
                    try:
                        decoded = value.decode('utf-8')
                    except:
                        decoded = base64.b64encode(value).decode('utf-8')
                
                if decoded is not None:
                    self._add_field(result, field_number, decoded)
                else:
                    self._add_field(result, field_number, value)
                    
            elif wire_type == 5:  # 32-bit
                value = self.read_fixed32()
                self._add_field(result, field_number, value)
            else:
                # Unknown wire type, skip or break
                return result
        return result

    def _add_field(self, result, field_number, value):
        key = str(field_number)
        if key in result:
            if isinstance(result[key], list):
                result[key].append(value)
            else:
                result[key] = [result[key], value]
        else:
            result[key] = value

    def read_varint(self):
        value = 0
        shift = 0
        while True:
            if self.pos >= len(self.buffer):
                return value
            byte = self.buffer[self.pos]
            self.pos += 1
            value |= (byte & 0x7F) << shift
            if not (byte & 0x80):
                break
            shift += 7
        return value

    def read_fixed32(self):
        if self.pos + 4 > len(self.buffer):
            return 0
        value = struct.unpack('<I', self.buffer[self.pos:self.pos + 4])[0]
        self.pos += 4
        return value

    def read_fixed64(self):
        if self.pos + 8 > len(self.buffer):
            return 0
        value = struct.unpack('<Q', self.buffer[self.pos:self.pos + 8])[0]
        self.pos += 8
        return value
