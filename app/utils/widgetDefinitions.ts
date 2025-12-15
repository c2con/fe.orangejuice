// src/utils/widgetDefinitions.ts

// ---------------------------
// 1. 카테고리 공통 정의
// ---------------------------

export const CATEGORY_LABELS: Record<string, string> = {
    data: 'Data',
    transform: 'Transform',
    visualize: 'Visualize',
    model: 'Model',
    evaluate: 'Evaluate',
    unsupervised: 'Unsupervised',
    other: 'Other'
}

export const CATEGORY_ORDER = [
    'data',
    'transform',
    'visualize',
    'model',
    'evaluate',
    'unsupervised',
    'other'
]

export const CATEGORY_COLORS: Record<string, string> = {
    data: '#FFDCA8',
    transform: '#FFCCBC',
    visualize: '#FFCDD2',
    model: '#E1BEE7',
    evaluate: '#B2DFDB',
    unsupervised: '#CFD8DC',
    other: '#F5F5F5'
}

// ---------------------------
// 2. 위젯 타입 정의
// ---------------------------
export interface WidgetDefinition {
    id: string;
    label: string;
    categoryId: string;
    inputs: string[];
    outputs: string[];
    hasInput: boolean;
    hasOutput: boolean;
    icon: string;
}

/**
 * Orange3 위젯 전체 정의
 * - 모든 위젯의 입력/출력 포트를 명시적으로 정의했습니다.
 * - 위젯 아이콘 경로 매핑 포함
 */
export const WIDGET_DEFINITIONS: Record<string, WidgetDefinition> = {
    // =================================================================
    // 📂 DATA (데이터)
    // =================================================================
    "File": {
        id: "File", label: "File", categoryId: "data",
        inputs: [], outputs: ["Data"], hasInput: false, hasOutput: true,
        icon: "/icons/widgets/data/File.svg"
    },
    "CSVFileImport": {
        id: "CSVFile", label: "CSV File Import", categoryId: "data",
        inputs: [], outputs: ["Data"], hasInput: false, hasOutput: true,
        icon: "/icons/widgets/data/CSVFile.svg"
    },
    "DataSets": {
        id: "DataSets", label: "Datasets", categoryId: "data",
        inputs: [], outputs: ["Data"], hasInput: false, hasOutput: true,
        icon: "/icons/widgets/data/DataSets.svg"
    },
    "SQLTable": {
        id: "SQLTable", label: "SQL Table", categoryId: "data",
        inputs: [], outputs: ["Data"], hasInput: false, hasOutput: true,
        icon: "/icons/widgets/data/SQLTable.svg"
    },
    "Table": {
        id: "Table", label: "Data Table", categoryId: "data",
        inputs: ["Data"], outputs: ["Selected Data", "Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/Table.svg"
    },
    "PaintData": {
        id: "PaintData", label: "Paint Data", categoryId: "data",
        inputs: [], outputs: ["Data"], hasInput: false, hasOutput: true,
        icon: "/icons/widgets/data/PaintData.svg"
    },
    "DataInfo": {
        id: "DataInfo", label: "Data Info", categoryId: "data",
        inputs: ["Data"], outputs: [], hasInput: true, hasOutput: false,
        icon: "/icons/widgets/data/DataInfo.svg"
    },
    "FeatureStatistics": {
        id: "FeatureStatistics", label: "Feature Statistics", categoryId: "data",
        inputs: ["Data"], outputs: ["Statistics", "Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/FeatureStatistics.svg"
    },
    "Correlations": {
        id: "Correlations", label: "Correlations", categoryId: "data",
        inputs: ["Data"], outputs: ["Data", "Correlations"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/Correlations.svg"
    },
    "Colors": {
        id: "Colors", label: "Color", categoryId: "data",
        inputs: ["Data"], outputs: ["Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/Colors.svg"
    },
    "SaveData": {
        id: "SaveData", label: "Save Data", categoryId: "data",
        inputs: ["Data"], outputs: [], hasInput: true, hasOutput: false,
        icon: "/icons/widgets/data/Save.svg"
    },
    "EditDomain": {
        id: "EditDomain", label: "Edit Domain", categoryId: "data",
        inputs: ["Data"], outputs: ["Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/EditDomain.svg"
    },
    "CreateClass": {
        id: "CreateClass", label: "Create Class", categoryId: "data",
        inputs: ["Data"], outputs: ["Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/CreateClass.svg"
    },
    "CreateInstance": {
        id: "CreateInstance", label: "Create Instance", categoryId: "data",
        inputs: [], outputs: ["Data"], hasInput: false, hasOutput: true,
        icon: "/icons/widgets/data/CreateInstance.svg"
    },
    "Rank": {
        id: "Rank", label: "Rank", categoryId: "data",
        inputs: ["Data", "Scorer"], outputs: ["Reduced Data", "Scores"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/Rank.svg"
    },
    "Category-Data": {
        id: "Category-Data", label: "Category Data", categoryId: "data",
        inputs: ["Data"], outputs: ["Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/Category-Data.svg"
    },
    "DataSampler": {
        id: "DataSampler", label: "Data Sampler", categoryId: "data",
        inputs: ["Data"], outputs: ["Data Sample", "Remaining Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/DataSampler.svg"
    },
    "SelectColumns": {
        id: "SelectColumns", label: "Select Columns", categoryId: "data",
        inputs: ["Data", "Features"], outputs: ["Data", "Features"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/SelectColumns.svg"
    },
    "SelectRows": {
        id: "SelectRows", label: "Select Rows", categoryId: "data",
        inputs: ["Data"], outputs: ["Matching Data", "Unmatched Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/SelectRows.svg"
    },
    "Transpose": {
        id: "Transpose", label: "Transpose", categoryId: "data",
        inputs: ["Data"], outputs: ["Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/Transpose.svg"
    },
    "MergeData": {
        id: "MergeData", label: "Merge Data", categoryId: "data",
        inputs: ["Data", "Extra Data"], outputs: ["Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/MergeData.svg"
    },
    "Concatenate": {
        id: "Concatenate", label: "Concatenate", categoryId: "data",
        inputs: ["Primary Data", "Additional Data"], outputs: ["Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/Concatenate.svg"
    },
    "SelectByDataIndex": {
        id: "SelectByDataIndex", label: "Select by Index", categoryId: "data",
        inputs: ["Data", "Data Subset"], outputs: ["Selected Data", "Annotated Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/SelectByDataIndex.svg"
    },
    "Unique": {
        id: "Unique", label: "Unique", categoryId: "data",
        inputs: ["Data"], outputs: ["Unique Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/Unique.svg"
    },
    "AggregateColumns": {
        id: "AggregateColumns", label: "Aggregate Columns", categoryId: "data",
        inputs: ["Data"], outputs: ["Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/AggregateColumns.svg"
    },
    "Groupby": {
        id: "GroupBy", label: "Group By", categoryId: "data",
        inputs: ["Data"], outputs: ["Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/GroupBy.svg"
    },
    "Pivot": {
        id: "Pivot", label: "Pivot Table", categoryId: "data",
        inputs: ["Data"], outputs: ["Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/Pivot.svg"
    },
    "Melt": {
        id: "Melt", label: "Melt", categoryId: "data",
        inputs: ["Data"], outputs: ["Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/Melt.svg"
    },
    "Preprocess": {
        id: "Preprocess", label: "Preprocess", categoryId: "data",
        inputs: ["Data"], outputs: ["Preprocessor", "Preprocessed Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/Preprocess.svg"
    },
    "Impute": {
        id: "Impute", label: "Impute", categoryId: "data",
        inputs: ["Data", "Learner"], outputs: ["Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/Impute.svg"
    },
    "Discretize": {
        id: "Discretize", label: "Discretize", categoryId: "data",
        inputs: ["Data"], outputs: ["Data", "Preprocessor"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/Discretize.svg"
    },
    "Continuize": {
        id: "Continuize", label: "Continuize", categoryId: "data",
        inputs: ["Data"], outputs: ["Data", "Preprocessor"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/Continuize.svg"
    },
    "Normalize": {
        id: "Normalize", label: "Normalize", categoryId: "data",
        inputs: ["Data"], outputs: ["Data", "Preprocessor"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/Normalize.svg"
    },
    "Outliers": {
        id: "Outliers", label: "Outliers", categoryId: "data",
        inputs: ["Data"], outputs: ["Outliers", "Inliers", "Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/Outliers.svg"
    },
    "FeatureConstructor": {
        id: "FeatureConstructor", label: "Feature Constructor", categoryId: "data",
        inputs: ["Data"], outputs: ["Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/FeatureConstructor.svg"
    },
    "PythonScript": {
        id: "PythonScript", label: "Python Script", categoryId: "data",
        inputs: ["in_data", "in_learner", "in_classifier", "in_object"], outputs: ["out_data", "out_learner", "out_classifier", "out_object"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/PythonScript.svg"
    },
    "SelectColumnsRandom": {
        id: "SelectColumnsRandom", label: "Select Random Columns", categoryId: "data",
        inputs: ["Data"], outputs: ["Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/SelectColumnsRandom.svg"
    },
    "PurgeDomain": {
        id: "PurgeDomain", label: "Purge Domain", categoryId: "data",
        inputs: ["Data"], outputs: ["Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/PurgeDomain.svg"
    },
    "Random": {
        id: "Random", label: "Random Data", categoryId: "data",
        inputs: [], outputs: ["Data"], hasInput: false, hasOutput: true,
        icon: "/icons/widgets/data/Random.svg"
    },
    "Split": {
        id: "Split", label: "Split Data", categoryId: "data",
        inputs: ["Data"], outputs: ["Data Sample", "Remaining Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/Split.svg"
    },
    "Neighbors": {
        id: "Neighbors", label: "Neighbors", categoryId: "data",
        inputs: ["Data", "Reference"], outputs: ["Neighbors"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/Neighbors.svg"
    },
    "Transform": {
        id: "Transform", label: "Transform", categoryId: "data",
        inputs: ["Data"], outputs: ["Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/data/Transform.svg"
    },

    // =================================================================
    // 📊 VISUALIZE (시각화)
    // =================================================================
    "BoxPlot": {
        id: "BoxPlot", label: "Box Plot", categoryId: "visualize",
        inputs: ["Data"], outputs: ["Selected Data", "Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/visualize/BoxPlot.svg"
    },
    "ScatterPlot": {
        id: "ScatterPlot", label: "Scatter Plot", categoryId: "visualize",
        inputs: ["Data", "Data Subset", "Features"], outputs: ["Selected Data", "Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/visualize/ScatterPlot.svg"
    },
    "LinePlot": {
        id: "LinePlot", label: "Line Plot", categoryId: "visualize",
        inputs: ["Data"], outputs: ["Selected Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/visualize/LinePlot.svg"
    },
    "BarPlot": {
        id: "BarPlot", label: "Bar Plot", categoryId: "visualize",
        inputs: ["Data"], outputs: ["Selected Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/visualize/BarPlot.svg"
    },
    "Distributions": {
        id: "Distributions", label: "Distributions", categoryId: "visualize",
        inputs: ["Data"], outputs: ["Selected Data", "Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/visualize/Distribution.svg"
    },
    "Heatmap": {
        id: "Heatmap", label: "Heatmap", categoryId: "visualize",
        inputs: ["Data"], outputs: ["Selected Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/visualize/Heatmap.svg"
    },
    "MosaicDisplay": {
        id: "MosaicDisplay", label: "Mosaic Display", categoryId: "visualize",
        inputs: ["Data"], outputs: ["Selected Data", "Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/visualize/MosaicDisplay.svg"
    },
    "SieveDiagram": {
        id: "SieveDiagram", label: "Sieve Diagram", categoryId: "visualize",
        inputs: ["Data"], outputs: ["Selected Data", "Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/visualize/SieveDiagram.svg"
    },
    "SilhouettePlot": {
        id: "SilhouettePlot", label: "Silhouette Plot", categoryId: "visualize",
        inputs: ["Data", "Silhouette Data"], outputs: ["Selected Data", "Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/visualize/SilhouettePlot.svg"
    },
    "TreeViewer": {
        id: "TreeViewer", label: "Tree Viewer", categoryId: "visualize",
        inputs: ["Tree"], outputs: ["Selected Data", "Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/visualize/TreeViewer.svg"
    },
    "VennDiagram": {
        id: "VennDiagram", label: "Venn Diagram", categoryId: "visualize",
        inputs: ["Data"], outputs: ["Selected Data", "Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/visualize/VennDiagram.svg"
    },
    "LinearProjection": {
        id: "LinearProjection", label: "Linear Projection", categoryId: "visualize",
        inputs: ["Data", "Data Subset", "Projection"], outputs: ["Selected Data", "Data", "Components"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/visualize/LinearProjection.svg"
    },
    "Radviz": {
        id: "Radviz", label: "Radviz", categoryId: "visualize",
        inputs: ["Data", "Data Subset"], outputs: ["Selected Data", "Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/visualize/Radviz.svg"
    },
    "Freeviz": {
        id: "Freeviz", label: "Freeviz", categoryId: "visualize",
        inputs: ["Data", "Data Subset"], outputs: ["Selected Data", "Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/visualize/Freeviz.svg"
    },
    "ViolinPlot": {
        id: "ViolinPlot", label: "Violin Plot", categoryId: "visualize",
        inputs: ["Data"], outputs: ["Selected Data", "Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/visualize/ViolinPlot.svg"
    },
    "PythagoreanForest": {
        id: "PythagoreanForest", label: "Pythagorean Forest", categoryId: "visualize",
        inputs: ["Random Forest"], outputs: ["Tree"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/visualize/PythagoreanForest.svg"
    },
    "PythagoreanTree": {
        id: "PythagoreanTree", label: "Pythagorean Tree", categoryId: "visualize",
        inputs: ["Tree"], outputs: ["Selected Data", "Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/visualize/PythagoreanTree.svg"
    },
    "Nomogram": {
        id: "Nomogram", label: "Nomogram", categoryId: "visualize",
        inputs: ["Classifier", "Data"], outputs: ["Features"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/visualize/Nomogram.svg"
    },
    "ParallelCoordinates": {
        id: "ParallelCoordinates", label: "Parallel Coordinates", categoryId: "visualize",
        inputs: ["Data"], outputs: ["Selected Data", "Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/visualize/ParallelCoordinates.svg"
    },
    "CN2RuleViewer": {
        id: "CN2RuleViewer", label: "CN2 Rule Viewer", categoryId: "visualize",
        inputs: ["CN2 Rule Classifier"], outputs: ["Selected Data", "Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/visualize/CN2RuleViewer.svg"
    },
    "ScoringSheetViewer": {
        id: "ScoringSheetViewer", label: "Scoring Sheet Viewer", categoryId: "visualize",
        inputs: ["Scoring Sheet"], outputs: [], hasInput: true, hasOutput: false,
        icon: "/icons/widgets/visualize/ScoringSheetViewer.svg"
    },
    "Category-Visualize": {
        id: "Category-Visualize", label: "Category Visualize", categoryId: "visualize",
        inputs: ["Data"], outputs: ["Data"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/visualize/Category-Visualize.svg"
    },
    "interval-horizontal": {
        id: "interval-horizontal", label: "Interval Horizontal", categoryId: "visualize",
        inputs: ["Data"], outputs: [], hasInput: true, hasOutput: false,
        icon: "/icons/widgets/visualize/interval-horizontal.svg"
    },
    "interval-vertical": {
        id: "interval-vertical", label: "Interval Vertical", categoryId: "visualize",
        inputs: ["Data"], outputs: [], hasInput: true, hasOutput: false,
        icon: "/icons/widgets/visualize/interval-vertical.svg"
    },

    // =================================================================
    // 🧠 MODEL (모델링)
    // =================================================================
    "kNN": {
        id: "kNN", label: "kNN", categoryId: "model",
        inputs: ["Data", "Preprocessor"], outputs: ["Learner", "Model"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/model/KNN.svg"
    },
    "Tree": {
        id: "Tree", label: "Tree", categoryId: "model",
        inputs: ["Data", "Preprocessor", "Sample Weights"],
        outputs: ["Model", "Learner", "Tree", "Selected Data"], // [중요] 오렌지3 순서 반영
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/model/Tree.svg"
    },
    "RandomForest": {
        id: "RandomForest", label: "Random Forest", categoryId: "model",
        inputs: ["Data", "Preprocessor"], outputs: ["Learner", "Model"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/model/RandomForest.svg"
    },
    "GradientBoosting": {
        id: "GradientBoosting", label: "Gradient Boosting", categoryId: "model",
        inputs: ["Data", "Preprocessor"], outputs: ["Learner", "Model"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/model/GradientBoosting.svg"
    },
    "SVM": {
        id: "SVM", label: "SVM", categoryId: "model",
        inputs: ["Data", "Preprocessor"], outputs: ["Learner", "Model", "Support Vectors"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/model/SVM.svg"
    },
    "LinearRegression": {
        id: "LinearRegression", label: "Linear Regression", categoryId: "model",
        inputs: ["Data", "Preprocessor"], outputs: ["Learner", "Model", "Coefficients"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/model/LinearRegression.svg"
    },
    "LogisticRegression": {
        id: "LogisticRegression", label: "Logistic Regression", categoryId: "model",
        inputs: ["Data", "Preprocessor"], outputs: ["Learner", "Model", "Coefficients"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/model/LogisticRegression.svg"
    },
    "NaiveBayes": {
        id: "NaiveBayes", label: "Naive Bayes", categoryId: "model",
        inputs: ["Data", "Preprocessor"], outputs: ["Learner", "Model"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/model/NaiveBayes.svg"
    },
    "AdaBoost": {
        id: "AdaBoost", label: "AdaBoost", categoryId: "model",
        inputs: ["Data", "Preprocessor", "Learner"], outputs: ["Learner", "Model"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/model/AdaBoost.svg"
    },
    "NeuralNetwork": {
        id: "NN", label: "Neural Network", categoryId: "model",
        inputs: ["Data", "Preprocessor"], outputs: ["Learner", "Model"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/model/NN.svg"
    },
    "SGD": {
        id: "SGD", label: "Stochastic Gradient", categoryId: "model",
        inputs: ["Data", "Preprocessor"], outputs: ["Learner", "Model"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/model/SGD.svg"
    },
    "Stacking": {
        id: "Stacking", label: "Stacking", categoryId: "model",
        inputs: ["Data", "Preprocessor", "Learner", "Aggregate"], outputs: ["Learner", "Model"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/model/Stacking.svg"
    },
    "Constant": {
        id: "Constant", label: "Constant", categoryId: "model",
        inputs: ["Data", "Preprocessor"], outputs: ["Learner", "Model"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/model/Constant.svg"
    },
    "CN2RuleInduction": {
        id: "CN2RuleInduction", label: "CN2 Rule Induction", categoryId: "model",
        inputs: ["Data", "Preprocessor"], outputs: ["Learner", "CN2 Rule Classifier"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/model/CN2RuleInduction.svg"
    },
    "CalibratedLearner": {
        id: "CalibratedLearner", label: "Calibrated Learner", categoryId: "model",
        inputs: ["Data", "Learner"], outputs: ["Learner", "Model"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/model/CalibratedLearner.svg"
    },
    "UnivariateRegression": {
        id: "UnivariateRegression", label: "Univariate Regression", categoryId: "model",
        inputs: ["Data", "Preprocessor"], outputs: ["Learner", "Model"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/model/UnivariateRegression.svg"
    },
    "CurveFit": {
        id: "CurveFit", label: "Curve Fit", categoryId: "model",
        inputs: ["Data", "Preprocessor"], outputs: ["Learner", "Model", "Coefficients"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/model/CurveFit.svg"
    },
    "PLS": {
        id: "PLS", label: "PLS", categoryId: "model",
        inputs: ["Data", "Preprocessor"], outputs: ["Learner", "Model", "Coefficients"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/model/PLS.svg"
    },
    "LoadModel": {
        id: "LoadModel", label: "Load Model", categoryId: "model",
        inputs: [], // Source
        outputs: ["Model"], hasInput: false, hasOutput: true,
        icon: "/icons/widgets/model/LoadModel.svg"
    },
    "SaveModel": {
        id: "SaveModel", label: "Save Model", categoryId: "model",
        inputs: ["Model"], outputs: [], // Sink
        hasInput: true, hasOutput: false,
        icon: "/icons/widgets/model/SaveModel.svg"
    },
    "ScoringSheet": {
        id: "ScoringSheet", label: "Scoring Sheet", categoryId: "model",
        inputs: ["Data"], outputs: ["Learner", "Model", "Coefficients"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/model/ScoringSheet.svg"
    },
    "Category-Model": {
        id: "Category-Model", label: "Category Model", categoryId: "model",
        inputs: ["Data"], outputs: ["Model"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/model/Category-Model.svg"
    },

    // =================================================================
    // ⚖️ EVALUATE (평가)
    // =================================================================
    "TestAndScore": {
        id: "TestAndScore", label: "Test and Score", categoryId: "evaluate",
        inputs: ["Data", "Test Data", "Learner"], outputs: ["Evaluation Results", "Predictions", "Test Data"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/evaluate/TestLearners1.svg"
    },
    "Predictions": {
        id: "Predictions", label: "Predictions", categoryId: "evaluate",
        inputs: ["Data", "Predictors"], outputs: ["Predictions", "Evaluation Results"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/evaluate/Predictions.svg"
    },
    "ConfusionMatrix": {
        id: "ConfusionMatrix", label: "Confusion Matrix", categoryId: "evaluate",
        inputs: ["Evaluation Results"], outputs: ["Selected Data"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/evaluate/ConfusionMatrix.svg"
    },
    "ROCAnalysis": {
        id: "ROCAnalysis", label: "ROC Analysis", categoryId: "evaluate",
        inputs: ["Evaluation Results"], outputs: ["Selected Data"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/evaluate/ROCAnalysis.svg"
    },
    "LiftCurve": {
        id: "LiftCurve", label: "Lift Curve", categoryId: "evaluate",
        inputs: ["Evaluation Results"], outputs: ["Selected Data"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/evaluate/LiftCurve.svg"
    },
    "CalibrationPlot": {
        id: "CalibrationPlot", label: "Calibration Plot", categoryId: "evaluate",
        inputs: ["Evaluation Results"], outputs: ["Selected Data", "Calibrated Model"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/evaluate/CalibrationPlot.svg"
    },
    "PermutationPlot": {
        id: "PermutationPlot", label: "Permutation Plot", categoryId: "evaluate",
        inputs: ["Data", "Learner"], outputs: ["Evaluation Results"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/evaluate/PermutationPlot.svg"
    },
    "ParameterFitter": {
        id: "ParameterFitter", label: "Parameter Fitter", categoryId: "evaluate",
        inputs: ["Data", "Learner"], outputs: ["Learner", "Evaluation Results"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/evaluate/ParameterFitter.svg"
    },
    "FeatureAsPredictor": {
        id: "FeatureAsPredictor", label: "Feature as Predictor", categoryId: "evaluate",
        inputs: ["Data"], outputs: ["Predictor"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/evaluate/FeatureAsPredictor.svg"
    },
    "TestLearners1": {
        id: "TestLearners1", label: "Test Learners 1", categoryId: "evaluate",
        inputs: ["Data", "Learner"], outputs: ["Evaluation Results"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/evaluate/TestLearners1.svg"
    },
    "TestLearners2": {
        id: "TestLearners2", label: "Test Learners 2", categoryId: "evaluate",
        inputs: ["Data", "Learner"], outputs: ["Evaluation Results"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/evaluate/TestLearners2.svg"
    },
    "Category-Evaluate": {
        id: "Category-Evaluate", label: "Category Evaluate", categoryId: "evaluate",
        inputs: ["Evaluation Results"], outputs: ["Evaluation Results"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/evaluate/Category-Evaluate.svg"
    },

    // =================================================================
    // 🔍 UNSUPERVISED (비지도 학습)
    // =================================================================
    "Distance": {
        id: "Distance", label: "Distances", categoryId: "unsupervised",
        inputs: ["Data"], outputs: ["Distances"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/unsupervised/Distance.svg"
    },
    "DistanceMatrix": {
        id: "DistanceMatrix", label: "Distance Matrix", categoryId: "unsupervised",
        inputs: ["Distances"], outputs: ["Selected Data", "Distance Matrix"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/unsupervised/DistanceMatrix.svg"
    },
    "DistanceMap": {
        id: "DistanceMap", label: "Distance Map", categoryId: "unsupervised",
        inputs: ["Distances"], outputs: ["Selected Data", "Data"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/unsupervised/DistanceMap.svg"
    },
    "K-Means": {
        id: "KMeans", label: "k-Means", categoryId: "unsupervised",
        inputs: ["Data"], outputs: ["Data", "Centroids"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/unsupervised/KMeans.svg"
    },
    "HierarchicalClustering": {
        id: "HierarchicalClustering", label: "Hierarchical Clustering", categoryId: "unsupervised",
        inputs: ["Distances"], outputs: ["Selected Data", "Data"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/unsupervised/HierarchicalClustering.svg"
    },
    "PCA": {
        id: "PCA", label: "PCA", categoryId: "unsupervised",
        inputs: ["Data"], outputs: ["Transformed Data", "Components"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/unsupervised/PCA.svg"
    },
    "MDS": {
        id: "MDS", label: "MDS", categoryId: "unsupervised",
        inputs: ["Distances", "Data"], outputs: ["Selected Data", "Data"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/unsupervised/MDS.svg"
    },
    "TSNE": {
        id: "TSNE", label: "t-SNE", categoryId: "unsupervised",
        inputs: ["Data"], outputs: ["Selected Data", "Data"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/unsupervised/TSNE.svg"
    },
    "Manifold": {
        id: "Manifold", label: "Manifold Learning", categoryId: "unsupervised",
        inputs: ["Data"], outputs: ["Transformed Data"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/unsupervised/Manifold.svg"
    },
    "DBSCAN": {
        id: "DBSCAN", label: "DBSCAN", categoryId: "unsupervised",
        inputs: ["Data", "Distances"], outputs: ["Data"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/unsupervised/DBSCAN.svg"
    },
    "LouvainClustering": {
        id: "LouvainClustering", label: "Louvain Clustering", categoryId: "unsupervised",
        inputs: ["Graph"], outputs: ["Data"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/unsupervised/LouvainClustering.svg"
    },
    "CorrespondenceAnalysis": {
        id: "CorrespondenceAnalysis", label: "Correspondence Analysis", categoryId: "unsupervised",
        inputs: ["Data"], outputs: ["Coordinates"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/unsupervised/CorrespondenceAnalysis.svg"
    },
    "DistancesTransformation": {
        id: "DistancesTransformation", label: "Distances Transformation", categoryId: "unsupervised",
        inputs: ["Distances"], outputs: ["Distances"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/unsupervised/DistancesTransformation.svg"
    },
    "SOM": {
        id: "SOM", label: "SOM", categoryId: "unsupervised",
        inputs: ["Data"], outputs: ["Selected Data", "Data"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/unsupervised/SOM.svg"
    },
    "DistanceFile": {
        id: "DistanceFile", label: "Distance File", categoryId: "unsupervised",
        inputs: [], // Source
        outputs: ["Distances"],
        hasInput: false, hasOutput: true,
        icon: "/icons/widgets/unsupervised/DistanceFile.svg"
    },
    "SaveDistances": {
        id: "SaveDistances", label: "Save Distances", categoryId: "unsupervised",
        inputs: ["Distances"], outputs: [], // Sink
        hasInput: true, hasOutput: false,
        icon: "/icons/widgets/unsupervised/SaveDistances.svg"
    },
    "Category-Unsupervised": {
        id: "Category-Unsupervised", label: "Category Unsupervised", categoryId: "unsupervised",
        inputs: ["Data"], outputs: ["Data"],
        hasInput: true, hasOutput: true,
        icon: "/icons/widgets/unsupervised/Category-Unsupervised.svg"
    },
    // =================================================================
    // 🔗 ASSOCIATE (연관 분석 - 누락된 부분 추가)
    // =================================================================
    "FrequentItemsets": {
        id: "FrequentItemsets", label: "Frequent Itemsets", categoryId: "associate",
        inputs: ["Data"], outputs: ["Frequent Itemsets"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/associate/FrequentItemsets.svg" // 아이콘 경로 확인 필요
    },
    "AssociationRules": {
        id: "AssociationRules", label: "Association Rules", categoryId: "associate",
        inputs: ["Data", "Frequent Itemsets"], outputs: ["Association Rules"], hasInput: true, hasOutput: true,
        icon: "/icons/widgets/associate/AssociationRules.svg" // 아이콘 경로 확인 필요
    },

};

/**
 * [수정됨] 정의되지 않은 위젯 요청 시 에러 방지용 기본 객체
 * 사용자님의 WidgetDefinition 인터페이스 구조에 맞췄습니다.
 */
function getFallbackWidget(originalName: string): WidgetDefinition {
    return {
        id: originalName,
        label: originalName,
        categoryId: 'other',
        inputs: [],   // [수정] 기본값은 비워둠 (엣지 분석 후 채움)
        outputs: [],  // [수정] 기본값은 비워둠
        hasInput: false,  // 기본값: 없음
        hasOutput: false, // 기본값: 없음
        icon: '/icons/widgets/default.svg'
    };
}
/**
 * [수정됨] 위젯 정의를 찾는 함수 (객체 구조 호환)
 */
export function getWidgetDef(idOrName: string): WidgetDefinition {
    if (!idOrName) return getFallbackWidget("Unknown");

    // 1. Key(ID)로 직접 찾기 (가장 빠르고 정확함)
    if (WIDGET_DEFINITIONS[idOrName]) {
        return WIDGET_DEFINITIONS[idOrName];
    }

    // 2. Key로 못 찾았다면, 전체를 순회하며 이름 비교 (Fuzzy Search)
    // Object.values()를 사용하여 객체를 배열로 변환 후 검색
    const allWidgets = Object.values(WIDGET_DEFINITIONS);

    // 공백 제거 및 소문자 변환 후 비교 ("Import Images" -> "importimages")
    const searchKey = idOrName.replace(/\s+/g, '').toLowerCase();

    const def = allWidgets.find((w: WidgetDefinition) => {
        const wId = w.id.replace(/\s+/g, '').toLowerCase();
        const wLabel = w.label.replace(/\s+/g, '').toLowerCase();

        return wId === searchKey || wLabel === searchKey;
    });

    if (def) return def;

    // 3. 그래도 없으면 기본값 반환 (에러 방지)
    console.warn(`[widgetDefinitions] 위젯 정의를 찾을 수 없습니다: "${idOrName}"`);
    return getFallbackWidget(idOrName);
}

// 카테고리 색상 가져오기 (기존 유지)
export function getCategoryColor(categoryId: string): string {
    return CATEGORY_COLORS[categoryId] ?? CATEGORY_COLORS.other ?? '#CCCCCC';
}

// 위젯 → 색상 (기존 유지)
export function getWidgetColor(widgetId: string): string {
    const def = getWidgetDef(widgetId);
    return getCategoryColor(def.categoryId);
}