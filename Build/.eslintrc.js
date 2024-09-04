module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:compat/recommended",
        "plugin:import/recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "overrides": [
        {
            "env": {
                "node": true
            },
            "files": [
                ".eslintrc.{js,cjs}"
            ],
            "parserOptions": {
                "sourceType": "script"
            }
        }
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "plugins": [
        "compat",
        "import",
        "@typescript-eslint"
    ],
    "rules": {
        "compat/compat": "error",
        // turn on errors for missing imports
        "import/no-unresolved": "error",
    },
    "settings": {
        "eslint-target-browser": [
            "ie >= 11",
            "not op_mini all"
        ],
        "import/resolver": {
          "babel-module": {}
        }
    }
}
