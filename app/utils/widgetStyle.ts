// src/utils/widgetStyle.ts

import { getWidgetDef } from "@/utils/widgetDefinitions"

/**
 * Orange3 실제 스크린샷 기반 색상 테마
 */
export const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    // 📂 Data: 주황색/살구색 (File, Select Columns 등)
    data: {
        bg: "linear-gradient(135deg, #FFE0B2 0%, #FFCC80 100%)", // 연한 주황
        border: "#FB8C00", // 진한 주황 테두리
        text: "#333333"
    },
    // 🟡 Data Table (별도 정의): 노란색 (스크린샷 반영)
    dataTable: {
        bg: "linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%)", // 연한 노랑
        border: "#FBC02D", // 진한 노랑 테두리
        text: "#333333"
    },
    // 📊 Visualize: 주황/다홍 계열 (Tree Viewer 등) - Data와 비슷하지만 약간 진함
    visualize: {
        bg: "linear-gradient(135deg, #FFCCBC 0%, #FFAB91 100%)",
        border: "#FF5722",
        text: "#333333"
    },
    // 🧠 Model: 분홍색 (Tree, Random Forest 등)
    model: {
        bg: "linear-gradient(135deg, #F8BBD0 0%, #F48FB1 100%)", // 연한 분홍
        border: "#EC407A", // 진한 분홍 테두리
        text: "#333333"
    },
    // ⚖️ Evaluate: 청록색/하늘색 (Test & Score, Predictions 등)
    evaluate: {
        bg: "linear-gradient(135deg, #B2EBF2 0%, #80DEEA 100%)", // 연한 청록
        border: "#00ACC1", // 진한 청록 테두리
        text: "#333333"
    },
    // 🔍 Unsupervised: 연두색/초록색
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

/**
 * 위젯 ID -> 색상 반환
 */
export function getWidgetColors(widgetId: string) {
    const def = getWidgetDef(widgetId);

    // 1. Data Table 예외 처리 (ID가 "Table"인 경우)
    if (def.id === "Table" || widgetId === "DataTable") {
        return CATEGORY_COLORS.dataTable;
    }

    // 2. 카테고리별 색상 반환
    if (def && def.categoryId && CATEGORY_COLORS[def.categoryId]) {
        return CATEGORY_COLORS[def.categoryId];
    }

    return CATEGORY_COLORS.default;
}