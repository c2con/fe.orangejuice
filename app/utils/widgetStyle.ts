// src/utils/widgetStyle.ts

import { getWidgetDef } from "@/utils/widgetDefinitions"

export const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    // 📂 Data (File, Select Columns 등): 주황색
    data: {
        bg: "linear-gradient(135deg, #FFE0B2 0%, #FFCC80 100%)",
        border: "#FB8C00",
        text: "#333333"
    },
    // 🟡 Data Table (특수 케이스): 노란색
    dataTable: {
        bg: "linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%)",
        border: "#FBC02D",
        text: "#333333"
    },
    // 📊 Visualize (Tree Viewer 등): 주황/다홍 계열 (Data보다 진함)
    visualize: {
        bg: "linear-gradient(135deg, #FFCCBC 0%, #FFAB91 100%)",
        border: "#FF5722",
        text: "#333333"
    },
    // 🧠 Model (Tree, SVM 등): 분홍색
    model: {
        bg: "linear-gradient(135deg, #F8BBD0 0%, #F48FB1 100%)",
        border: "#EC407A",
        text: "#333333"
    },
    // ⚖️ Evaluate (Test & Score, Predictions 등): 청록색 (스크린샷 반영)
    evaluate: {
        bg: "linear-gradient(135deg, #B2EBF2 0%, #80DEEA 100%)",
        border: "#00ACC1",
        text: "#333333"
    },
    // 🔍 Unsupervised (KMeans 등): 초록색
    unsupervised: {
        bg: "linear-gradient(135deg, #DCEDC8 0%, #AED581 100%)",
        border: "#7CB342",
        text: "#333333"
    },
    // 기본값
    default: {
        bg: "#ffffff",
        border: "#cccccc",
        text: "#333333"
    }
}

export function getWidgetColors(widgetId: string) {
    const def = getWidgetDef(widgetId);

    // [중요] Data Table은 카테고리 무시하고 별도 색상 적용
    if (def.id === "Table" || widgetId === "DataTable") {
        return CATEGORY_COLORS.dataTable;
    }

    if (def && def.categoryId && CATEGORY_COLORS[def.categoryId]) {
        return CATEGORY_COLORS[def.categoryId];
    }

    return CATEGORY_COLORS.default;
}