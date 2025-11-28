// src/utils/widgetDefinitions.ts

export interface WidgetDefinition {
    id: string;
    label: string;
    categoryId: string;
    hasInput: boolean;
    hasOutput: boolean;
    icon: string;
    priority?: number; // 정렬 순서를 위한 필드 추가
}

/**
 * Orange3 위젯 전체 정의
 * 순서는 Orange3 v3.3x UI 표준 순서를 따름
 */
export const WIDGET_DEFINITIONS: Record<string, WidgetDefinition> = {
    // =================================================================
    // 📂 DATA (데이터 로드 및 저장, 기본 정보)
    // =================================================================
    "File": {
        id: "File",
        label: "File",
        categoryId: "data",
        hasInput: false,
        hasOutput: true,
        icon: "/icons/widgets/data/File.svg",
        priority: 10
    },
    "CSVFile": {
        id: "CSVFile",
        label: "CSV File Import",
        categoryId: "data",
        hasInput: false,
        hasOutput: true,
        icon: "/icons/widgets/data/CSVFile.svg",
        priority: 20
    },
    "DataSets": {
        id: "DataSets",
        label: "Datasets",
        categoryId: "data",
        hasInput: false,
        hasOutput: true,
        icon: "/icons/widgets/data/DataSets.svg",
        priority: 30
    },
    "SQLTable": {
        id: "SQLTable",
        label: "SQL Table",
        categoryId: "data",
        hasInput: false,
        hasOutput: true,
        icon: "/icons/widgets/data/SQLTable.svg",
        priority: 40
    },
    "Table": {
        id: "Table",
        label: "Data Table",
        categoryId: "data",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/Table.svg",
        priority: 50
    },
    "PaintData": {
        id: "PaintData",
        label: "Paint Data",
        categoryId: "data",
        hasInput: false,
        hasOutput: true,
        icon: "/icons/widgets/data/PaintData.svg",
        priority: 60
    },
    "DataInfo": {
        id: "DataInfo",
        label: "Data Info",
        categoryId: "data",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/DataInfo.svg",
        priority: 70
    },
    "FeatureStatistics": {
        id: "FeatureStatistics",
        label: "Feature Statistics",
        categoryId: "data",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/FeatureStatistics.svg",
        priority: 80
    },
    "Correlations": {
        id: "Correlations",
        label: "Correlations",
        categoryId: "data",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/Correlations.svg",
        priority: 90
    },
    "Color": { // 원래 이름 Colors -> Color (UI상 Color가 많음)
        id: "Colors",
        label: "Color",
        categoryId: "data",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/Colors.svg",
        priority: 100
    },
    "Save": {
        id: "Save",
        label: "Save Data",
        categoryId: "data",
        hasInput: true,
        hasOutput: false,
        icon: "/icons/widgets/data/Save.svg",
        priority: 110
    },
    "EditDomain": {
        id: "EditDomain",
        label: "Edit Domain",
        categoryId: "data",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/EditDomain.svg",
        priority: 120
    },
    "CreateClass": {
        id: "CreateClass",
        label: "Create Class",
        categoryId: "data",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/CreateClass.svg",
        priority: 130
    },
    "CreateInstance": {
        id: "CreateInstance",
        label: "Create Instance",
        categoryId: "data",
        hasInput: false,
        hasOutput: true,
        icon: "/icons/widgets/data/CreateInstance.svg",
        priority: 140
    },
    "Rank": {
        id: "Rank",
        label: "Rank",
        categoryId: "data",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/Rank.svg",
        priority: 150
    },
    "Category-Data": {
        id: "Category-Data",
        label: "Category Data",
        categoryId: "data",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/Category-Data.svg",
        priority: 999
    },

    // =================================================================
    // 🔄 TRANSFORM (데이터 변환 및 전처리) - Data에서 분리됨
    // =================================================================
    "DataSampler": {
        id: "DataSampler",
        label: "Data Sampler",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/DataSampler.svg",
        priority: 10
    },
    "SelectColumns": {
        id: "SelectColumns",
        label: "Select Columns",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/SelectColumns.svg",
        priority: 20
    },
    "SelectRows": {
        id: "SelectRows",
        label: "Select Rows",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/SelectRows.svg",
        priority: 30
    },
    "Transpose": {
        id: "Transpose",
        label: "Transpose",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/Transpose.svg",
        priority: 40
    },
    "MergeData": {
        id: "MergeData",
        label: "Merge Data",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/MergeData.svg",
        priority: 50
    },
    "Concatenate": {
        id: "Concatenate",
        label: "Concatenate",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/Concatenate.svg",
        priority: 60
    },
    "SelectByDataIndex": {
        id: "SelectByDataIndex",
        label: "Select by Index",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/SelectByDataIndex.svg",
        priority: 70
    },
    "Unique": {
        id: "Unique",
        label: "Unique",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/Unique.svg",
        priority: 80
    },
    "AggregateColumns": {
        id: "AggregateColumns",
        label: "Aggregate Columns",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/AggregateColumns.svg",
        priority: 90
    },
    "GroupBy": {
        id: "GroupBy",
        label: "Group By",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/GroupBy.svg",
        priority: 100
    },
    "Pivot": {
        id: "Pivot",
        label: "Pivot Table",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/Pivot.svg",
        priority: 110
    },
    "Melt": {
        id: "Melt",
        label: "Melt",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/Melt.svg",
        priority: 120
    },
    "Preprocess": {
        id: "Preprocess",
        label: "Preprocess",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/Preprocess.svg",
        priority: 130
    },
    "Impute": {
        id: "Impute",
        label: "Impute",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/Impute.svg",
        priority: 140
    },
    "Discretize": {
        id: "Discretize",
        label: "Discretize",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/Discretize.svg",
        priority: 150
    },
    "Continuize": {
        id: "Continuize",
        label: "Continuize",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/Continuize.svg",
        priority: 160
    },
    "Normalize": {
        id: "Normalize",
        label: "Normalize",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/Normalize.svg",
        priority: 170
    },
    "Outliers": {
        id: "Outliers",
        label: "Outliers",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/Outliers.svg",
        priority: 180
    },
    "FeatureConstructor": {
        id: "FeatureConstructor",
        label: "Feature Constructor",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/FeatureConstructor.svg",
        priority: 190
    },
    "PythonScript": {
        id: "PythonScript",
        label: "Python Script",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/PythonScript.svg",
        priority: 200
    },
    "SelectColumnsRandom": {
        id: "SelectColumnsRandom",
        label: "Select Random Columns",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/SelectColumnsRandom.svg",
        priority: 210
    },
    "PurgeDomain": {
        id: "PurgeDomain",
        label: "Purge Domain",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/PurgeDomain.svg",
        priority: 220
    },
    "Random": {
        id: "Random",
        label: "Random Data",
        categoryId: "transform",
        hasInput: false,
        hasOutput: true,
        icon: "/icons/widgets/data/Random.svg",
        priority: 230
    },
    "Split": {
        id: "Split",
        label: "Split Data",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/Split.svg",
        priority: 240
    },
    "Neighbors": {
        id: "Neighbors",
        label: "Neighbors",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/Neighbors.svg",
        priority: 250
    },
    "Transform": {
        id: "Transform",
        label: "Transform",
        categoryId: "transform",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/data/Transform.svg",
        priority: 260
    },

    // =================================================================
    // 📊 VISUALIZE (시각화)
    // =================================================================
    "BoxPlot": {
        id: "BoxPlot",
        label: "Box Plot",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/BoxPlot.svg",
        priority: 10
    },
    "ScatterPlot": {
        id: "ScatterPlot",
        label: "Scatter Plot",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/ScatterPlot.svg",
        priority: 20
    },
    "LinePlot": {
        id: "LinePlot",
        label: "Line Plot",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/LinePlot.svg",
        priority: 30
    },
    "BarPlot": {
        id: "BarPlot",
        label: "Bar Plot",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/BarPlot.svg",
        priority: 40
    },
    "Distribution": {
        id: "Distribution",
        label: "Distributions",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/Distribution.svg",
        priority: 50
    },
    "Heatmap": {
        id: "Heatmap",
        label: "Heatmap",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/Heatmap.svg",
        priority: 60
    },
    "MosaicDisplay": {
        id: "MosaicDisplay",
        label: "Mosaic Display",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/MosaicDisplay.svg",
        priority: 70
    },
    "SieveDiagram": {
        id: "SieveDiagram",
        label: "Sieve Diagram",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/SieveDiagram.svg",
        priority: 80
    },
    "SilhouettePlot": {
        id: "SilhouettePlot",
        label: "Silhouette Plot",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/SilhouettePlot.svg",
        priority: 90
    },
    "TreeViewer": {
        id: "TreeViewer",
        label: "Tree Viewer",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/TreeViewer.svg",
        priority: 100
    },
    "VennDiagram": {
        id: "VennDiagram",
        label: "Venn Diagram",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/VennDiagram.svg",
        priority: 110
    },
    "LinearProjection": {
        id: "LinearProjection",
        label: "Linear Projection",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/LinearProjection.svg",
        priority: 120
    },
    "Radviz": {
        id: "Radviz",
        label: "Radviz",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/Radviz.svg",
        priority: 130
    },
    "Freeviz": {
        id: "Freeviz",
        label: "Freeviz",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/Freeviz.svg",
        priority: 140
    },
    "ViolinPlot": {
        id: "ViolinPlot",
        label: "Violin Plot",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/ViolinPlot.svg",
        priority: 150
    },
    "PythagoreanForest": {
        id: "PythagoreanForest",
        label: "Pythagorean Forest",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/PythagoreanForest.svg",
        priority: 160
    },
    "PythagoreanTree": {
        id: "PythagoreanTree",
        label: "Pythagorean Tree",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/PythagoreanTree.svg",
        priority: 170
    },
    "Nomogram": {
        id: "Nomogram",
        label: "Nomogram",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/Nomogram.svg",
        priority: 180
    },
    "ParallelCoordinates": {
        id: "ParallelCoordinates",
        label: "Parallel Coordinates",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/ParallelCoordinates.svg",
        priority: 190
    },
    "CN2RuleViewer": {
        id: "CN2RuleViewer",
        label: "CN2 Rule Viewer",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/CN2RuleViewer.svg",
        priority: 200
    },
    "ScoringSheetViewer": {
        id: "ScoringSheetViewer",
        label: "Scoring Sheet Viewer",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/ScoringSheetViewer.svg",
        priority: 210
    },
    "Category-Visualize": {
        id: "Category-Visualize",
        label: "Category Visualize",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/Category-Visualize.svg",
        priority: 999
    },
    "interval-horizontal": {
        id: "interval-horizontal",
        label: "Interval Horizontal",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/interval-horizontal.svg",
        priority: 999
    },
    "interval-vertical": {
        id: "interval-vertical",
        label: "Interval Vertical",
        categoryId: "visualize",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/visualize/interval-vertical.svg",
        priority: 999
    },

    // =================================================================
    // 🧠 MODEL (모델링)
    // =================================================================
    "KNN": {
        id: "KNN",
        label: "kNN",
        categoryId: "model",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/model/KNN.svg",
        priority: 10
    },
    "Tree": {
        id: "Tree",
        label: "Tree",
        categoryId: "model",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/model/Tree.svg",
        priority: 20
    },
    "RandomForest": {
        id: "RandomForest",
        label: "Random Forest",
        categoryId: "model",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/model/RandomForest.svg",
        priority: 30
    },
    "GradientBoosting": {
        id: "GradientBoosting",
        label: "Gradient Boosting",
        categoryId: "model",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/model/GradientBoosting.svg",
        priority: 40
    },
    "SVM": {
        id: "SVM",
        label: "SVM",
        categoryId: "model",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/model/SVM.svg",
        priority: 50
    },
    "LinearRegression": {
        id: "LinearRegression",
        label: "Linear Regression",
        categoryId: "model",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/model/LinearRegression.svg",
        priority: 60
    },
    "LogisticRegression": {
        id: "LogisticRegression",
        label: "Logistic Regression",
        categoryId: "model",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/model/LogisticRegression.svg",
        priority: 70
    },
    "NaiveBayes": {
        id: "NaiveBayes",
        label: "Naive Bayes",
        categoryId: "model",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/model/NaiveBayes.svg",
        priority: 80
    },
    "AdaBoost": {
        id: "AdaBoost",
        label: "AdaBoost",
        categoryId: "model",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/model/AdaBoost.svg",
        priority: 90
    },
    "NN": {
        id: "NN",
        label: "Neural Network",
        categoryId: "model",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/model/NN.svg",
        priority: 100
    },
    "SGD": {
        id: "SGD",
        label: "Stochastic Gradient",
        categoryId: "model",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/model/SGD.svg",
        priority: 110
    },
    "Stacking": {
        id: "Stacking",
        label: "Stacking",
        categoryId: "model",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/model/Stacking.svg",
        priority: 120
    },
    "Constant": {
        id: "Constant",
        label: "Constant",
        categoryId: "model",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/model/Constant.svg",
        priority: 130
    },
    "CN2RuleInduction": {
        id: "CN2RuleInduction",
        label: "CN2 Rule Induction",
        categoryId: "model",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/model/CN2RuleInduction.svg",
        priority: 140
    },
    "CalibratedLearner": {
        id: "CalibratedLearner",
        label: "Calibrated Learner",
        categoryId: "model",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/model/CalibratedLearner.svg",
        priority: 150
    },
    "UnivariateRegression": {
        id: "UnivariateRegression",
        label: "Univariate Regression",
        categoryId: "model",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/model/UnivariateRegression.svg",
        priority: 160
    },
    "CurveFit": {
        id: "CurveFit",
        label: "Curve Fit",
        categoryId: "model",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/model/CurveFit.svg",
        priority: 170
    },
    "PLS": {
        id: "PLS",
        label: "PLS",
        categoryId: "model",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/model/PLS.svg",
        priority: 180
    },
    "LoadModel": {
        id: "LoadModel",
        label: "Load Model",
        categoryId: "model",
        hasInput: false,
        hasOutput: true,
        icon: "/icons/widgets/model/LoadModel.svg",
        priority: 190
    },
    "SaveModel": {
        id: "SaveModel",
        label: "Save Model",
        categoryId: "model",
        hasInput: true,
        hasOutput: false,
        icon: "/icons/widgets/model/SaveModel.svg",
        priority: 200
    },
    "ScoringSheet": {
        id: "ScoringSheet",
        label: "Scoring Sheet",
        categoryId: "model",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/model/ScoringSheet.svg",
        priority: 210
    },
    "Category-Model": {
        id: "Category-Model",
        label: "Category Model",
        categoryId: "model",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/model/Category-Model.svg",
        priority: 999
    },

    // =================================================================
    // ⚖️ EVALUATE (평가)
    // =================================================================
    "TestAndScore": {
        id: "TestAndScore",
        label: "Test and Score",
        categoryId: "evaluate",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/evaluate/TestLearners1.svg",
        priority: 10
    },
    "Predictions": {
        id: "Predictions",
        label: "Predictions",
        categoryId: "evaluate",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/evaluate/Predictions.svg",
        priority: 20
    },
    "ConfusionMatrix": {
        id: "ConfusionMatrix",
        label: "Confusion Matrix",
        categoryId: "evaluate",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/evaluate/ConfusionMatrix.svg",
        priority: 30
    },
    "ROCAnalysis": {
        id: "ROCAnalysis",
        label: "ROC Analysis",
        categoryId: "evaluate",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/evaluate/ROCAnalysis.svg",
        priority: 40
    },
    "LiftCurve": {
        id: "LiftCurve",
        label: "Lift Curve",
        categoryId: "evaluate",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/evaluate/LiftCurve.svg",
        priority: 50
    },
    "CalibrationPlot": {
        id: "CalibrationPlot",
        label: "Calibration Plot",
        categoryId: "evaluate",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/evaluate/CalibrationPlot.svg",
        priority: 60
    },
    "PermutationPlot": {
        id: "PermutationPlot",
        label: "Permutation Plot",
        categoryId: "evaluate",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/evaluate/PermutationPlot.svg",
        priority: 70
    },
    "ParameterFitter": {
        id: "ParameterFitter",
        label: "Parameter Fitter",
        categoryId: "evaluate",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/evaluate/ParameterFitter.svg",
        priority: 80
    },
    "FeatureAsPredictor": {
        id: "FeatureAsPredictor",
        label: "Feature as Predictor",
        categoryId: "evaluate",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/evaluate/FeatureAsPredictor.svg",
        priority: 90
    },
    "TestLearners1": {
        id: "TestLearners1",
        label: "Test Learners 1",
        categoryId: "evaluate",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/evaluate/TestLearners1.svg",
        priority: 99
    },
    "TestLearners2": {
        id: "TestLearners2",
        label: "Test Learners 2",
        categoryId: "evaluate",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/evaluate/TestLearners2.svg",
        priority: 99
    },
    "Category-Evaluate": {
        id: "Category-Evaluate",
        label: "Category Evaluate",
        categoryId: "evaluate",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/evaluate/Category-Evaluate.svg",
        priority: 999
    },

    // =================================================================
    // 🔍 UNSUPERVISED (비지도 학습)
    // =================================================================
    "Distance": {
        id: "Distance",
        label: "Distances",
        categoryId: "unsupervised",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/unsupervised/Distance.svg",
        priority: 10
    },
    "DistanceMatrix": {
        id: "DistanceMatrix",
        label: "Distance Matrix",
        categoryId: "unsupervised",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/unsupervised/DistanceMatrix.svg",
        priority: 20
    },
    "DistanceMap": {
        id: "DistanceMap",
        label: "Distance Map",
        categoryId: "unsupervised",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/unsupervised/DistanceMap.svg",
        priority: 30
    },
    "KMeans": {
        id: "KMeans",
        label: "k-Means",
        categoryId: "unsupervised",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/unsupervised/KMeans.svg",
        priority: 40
    },
    "HierarchicalClustering": {
        id: "HierarchicalClustering",
        label: "Hierarchical Clustering",
        categoryId: "unsupervised",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/unsupervised/HierarchicalClustering.svg",
        priority: 50
    },
    "PCA": {
        id: "PCA",
        label: "PCA",
        categoryId: "unsupervised",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/unsupervised/PCA.svg",
        priority: 60
    },
    "MDS": {
        id: "MDS",
        label: "MDS",
        categoryId: "unsupervised",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/unsupervised/MDS.svg",
        priority: 70
    },
    "TSNE": {
        id: "TSNE",
        label: "t-SNE",
        categoryId: "unsupervised",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/unsupervised/TSNE.svg",
        priority: 80
    },
    "Manifold": {
        id: "Manifold",
        label: "Manifold Learning",
        categoryId: "unsupervised",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/unsupervised/Manifold.svg",
        priority: 90
    },
    "DBSCAN": {
        id: "DBSCAN",
        label: "DBSCAN",
        categoryId: "unsupervised",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/unsupervised/DBSCAN.svg",
        priority: 100
    },
    "LouvainClustering": {
        id: "LouvainClustering",
        label: "Louvain Clustering",
        categoryId: "unsupervised",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/unsupervised/LouvainClustering.svg",
        priority: 110
    },
    "CorrespondenceAnalysis": {
        id: "CorrespondenceAnalysis",
        label: "Correspondence Analysis",
        categoryId: "unsupervised",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/unsupervised/CorrespondenceAnalysis.svg",
        priority: 120
    },
    "DistancesTransformation": {
        id: "DistancesTransformation",
        label: "Distances Transformation",
        categoryId: "unsupervised",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/unsupervised/DistancesTransformation.svg",
        priority: 130
    },
    "SOM": {
        id: "SOM",
        label: "SOM",
        categoryId: "unsupervised",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/unsupervised/SOM.svg",
        priority: 140
    },
    "DistanceFile": {
        id: "DistanceFile",
        label: "Distance File",
        categoryId: "unsupervised",
        hasInput: false,
        hasOutput: true,
        icon: "/icons/widgets/unsupervised/DistanceFile.svg",
        priority: 150
    },
    "SaveDistances": {
        id: "SaveDistances",
        label: "Save Distances",
        categoryId: "unsupervised",
        hasInput: true,
        hasOutput: false,
        icon: "/icons/widgets/unsupervised/SaveDistances.svg",
        priority: 160
    },
    "Category-Unsupervised": {
        id: "Category-Unsupervised",
        label: "Category Unsupervised",
        categoryId: "unsupervised",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/unsupervised/Category-Unsupervised.svg",
        priority: 999
    },

    // =================================================================
    // 🔗 ALIAS (중요: OWS 파일 이름과 매칭)
    // =================================================================
    "DataTable": { id: "Table", label: "Data Table", categoryId: "data", hasInput: true, hasOutput: true, icon: "/icons/widgets/data/Table.svg" },
    "TreeLearner": { id: "Tree", label: "Tree", categoryId: "model", hasInput: true, hasOutput: true, icon: "/icons/widgets/model/Tree.svg" },
    "SelectAttributes": { id: "SelectColumns", label: "Select Columns", categoryId: "transform", hasInput: true, hasOutput: true, icon: "/icons/widgets/data/SelectColumns.svg" },
    "TreeGraph": { id: "TreeViewer", label: "Tree Viewer", categoryId: "visualize", hasInput: true, hasOutput: true, icon: "/icons/widgets/visualize/TreeViewer.svg" },
    "TestLearners": { id: "TestAndScore", label: "Test and Score", categoryId: "evaluate", hasInput: true, hasOutput: true, icon: "/icons/widgets/evaluate/TestLearners1.svg" },
    "Data Sampler": { id: "DataSampler", label: "Data Sampler", categoryId: "transform", hasInput: true, hasOutput: true, icon: "/icons/widgets/data/DataSampler.svg" },
    "Select Columns": { id: "SelectColumns", label: "Select Columns", categoryId: "transform", hasInput: true, hasOutput: true, icon: "/icons/widgets/data/SelectColumns.svg" },
    "Test and Score": { id: "TestAndScore", label: "Test and Score", categoryId: "evaluate", hasInput: true, hasOutput: true, icon: "/icons/widgets/evaluate/TestLearners1.svg" },
    "Confusion Matrix": { id: "ConfusionMatrix", label: "Confusion Matrix", categoryId: "evaluate", hasInput: true, hasOutput: true, icon: "/icons/widgets/evaluate/ConfusionMatrix.svg" }
};

/**
 * 헬퍼 함수: 정의되지 않은 위젯이 요청될 경우 기본값 반환
 */
export function getWidgetDef(widgetName: string): WidgetDefinition {
    // 1. 정확한 매칭
    if (WIDGET_DEFINITIONS[widgetName]) {
        return WIDGET_DEFINITIONS[widgetName];
    }

    // 2. 공백 제거 후 매칭
    const safeName = widgetName || "";
    const normalized = safeName.replace(/\s+/g, '');

    if (WIDGET_DEFINITIONS[normalized]) {
        return WIDGET_DEFINITIONS[normalized];
    }

    // 3. 실패 시 기본값 (에러 방지)
    console.warn(`[getWidgetDef] 매칭 실패! 요청: "${widgetName}" -> normalized: "${normalized}".`);
    return {
        id: safeName,
        label: safeName,
        categoryId: "data",
        hasInput: true,
        hasOutput: true,
        icon: "/icons/widgets/default.svg",
        priority: 9999
    };
}