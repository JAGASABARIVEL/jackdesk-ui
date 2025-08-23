import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'performJsonOp'
})
export class PerformJsonOpPipe implements PipeTransform {

  transform(value: any, op: string): any {
    switch(op) {
      case "dump":
        return JSON.stringify(value);
      case "load":
        
        if (typeof value === 'string') {
          try {
            let parsed = JSON.parse(value);
            // Handle double-encoded string
            if (typeof parsed === 'string') {
              parsed = JSON.parse(parsed);
            }
            return parsed;
          } catch (e) {
            console.error("❌ Invalid JSON string passed to JSON.parse:", value);
            return value;
          }
        } else {
          console.warn("⚠️ Value is not a string, returning as-is:", value);
          return value;
        }
    }
  }
  
  
}
