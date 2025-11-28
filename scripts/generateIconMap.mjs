// scripts/generateIconMap.mjs
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const WIDGET_BASE = "/icons/widgets";

const CATEGORIES = ["data", "evaluate", "model", "unsupervised", "visualize"];

function stripExt(name) {
    return name.replace(/\.[^.]+$/, "");
}

function toKeyName(fileName) {
    // 확장자 제거
    return stripExt(fileName);
}

function main() {
    const lines = [];
    lines.push(`// ⚠ 자동 생성 파일입니다. scripts/generateIconMap.mjs를 수정하세요.`);
    lines.push(`export const WIDGET_BASE = "${WIDGET_BASE}";`);
    lines.push(``);
    lines.push(`export const ICON_MAP: Record<string, string> = {`);

    for (const cat of CATEGORIES) {
        const dir = path.join(ROOT, "public", "icons", "widgets", cat);
        if (!fs.existsSync(dir)) continue;

        const files = fs.readdirSync(dir).filter((f) => f.endsWith(".svg"));

        if (!files.length) continue;

        lines.push(`  // ===== ${cat} =====`);
        for (const file of files) {
            const key = toKeyName(file); // "File.svg" -> "File", "ConfusionMatrix.svg" -> "ConfusionMatrix"
            const relPath = `${WIDGET_BASE}/${cat}/${file}`;
            lines.push(`  "${key}": "${relPath}",`);
        }
        lines.push("");
    }

    lines.push(`};`);
    lines.push(``);

    const outPath = path.join(
        ROOT,
        "app",
        "utils",
        "widgetIconMap.ts", // 경로는 니가 실제로 쓰는 위치 맞춰서
    );

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, lines.join("\n"), "utf8");

    console.log(`✅ widgetIconMap.ts generated at: ${outPath}`);
}

main();
