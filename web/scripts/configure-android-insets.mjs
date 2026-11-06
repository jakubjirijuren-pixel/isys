import {readFileSync,writeFileSync} from "node:fs";
const path="android/app/src/main/java/cz/kubisoft/foxa/MainActivity.java";
const manifestPath="android/app/src/main/AndroidManifest.xml";
let manifest=readFileSync(manifestPath,"utf8");
if(!manifest.includes("android:screenOrientation=\"portrait\"")){
 manifest=manifest.replace(/(<activity\\b)/,'$1 android:screenOrientation="portrait"');
 writeFileSync(manifestPath,manifest);
 console.log("Locked FOXA FIELD to portrait orientation");
}
let source=readFileSync(path,"utf8");
if(!source.includes("extends BridgeActivity"))throw Error("Unexpected Capacitor MainActivity");
if(source.includes("WindowInsetsCompat"))process.exit(0);
source=source.replace(/import com\.getcapacitor\.BridgeActivity;/, `import com.getcapacitor.BridgeActivity;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;`);
source=source.replace(/public class MainActivity extends BridgeActivity\s*\{/, `public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Android 15+ enforces edge-to-edge. Reserve native system bar insets
    // once for the entire WebView, including every FOXA module and dock.
    if (Build.VERSION.SDK_INT >= 35) {
      View root = findViewById(android.R.id.content);
      ViewCompat.setOnApplyWindowInsetsListener(root, (view, insets) -> {
        androidx.core.graphics.Insets bars = insets.getInsets(
          WindowInsetsCompat.Type.systemBars());
        view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
        return insets;
      });
      ViewCompat.requestApplyInsets(root);
    }
  }
`);
writeFileSync(path,source);
console.log("Configured native Android 15+ system bar insets");
