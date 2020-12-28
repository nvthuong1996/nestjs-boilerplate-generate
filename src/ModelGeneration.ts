import * as Handlebars from "handlebars";
import * as Prettier from "prettier";
import * as changeCase from "change-case";
import * as fs from "fs";
import * as path from "path";
import { EOL } from "os";
import IConnectionOptions from "./IConnectionOptions";
import IGenerationOptions, { eolConverter } from "./IGenerationOptions";
import { Entity } from "./models/Entity";
import { Relation } from "./models/Relation";

const prettierOptions: Prettier.Options = {
    parser: "typescript",
    endOfLine: "auto",
};

export default function modelGenerationPhase(
    connectionOptions: IConnectionOptions,
    generationOptions: IGenerationOptions,
    databaseModel: Entity[]
): void {
    createHandlebarsHelpers(generationOptions);

    const resultPath = generationOptions.resultsPath;
    if (!fs.existsSync(resultPath)) {
        fs.mkdirSync(resultPath);
    }
    let entitiesPath = resultPath;
    let servicesPath;
    let controllerPath;
    let dtoPath;
    const modulePath = resultPath;
    if (!generationOptions.noConfigs) {
        // createTsConfigFile(resultPath);
        // createTypeOrmConfig(resultPath, connectionOptions);
        entitiesPath = path.resolve(resultPath, "./entities");
        if (!fs.existsSync(entitiesPath)) {
            fs.mkdirSync(entitiesPath);
        }
        servicesPath = path.resolve(resultPath, "./services");
        if (!fs.existsSync(servicesPath)) {
            fs.mkdirSync(servicesPath);
        }
        controllerPath = path.resolve(resultPath, "./controllers");
        if (!fs.existsSync(controllerPath)) {
            fs.mkdirSync(controllerPath);
        }
        dtoPath = path.resolve(resultPath, "./dtos");
        if (!fs.existsSync(dtoPath)) {
            fs.mkdirSync(dtoPath);
        }
    }
    if (generationOptions.indexFile) {
        createIndexFile(databaseModel, generationOptions, entitiesPath);
    }
    generateModels(databaseModel, generationOptions, entitiesPath);
    generateServices(databaseModel, generationOptions, servicesPath);
    generateControllers(databaseModel, generationOptions, controllerPath);
    generateModules(databaseModel, generationOptions, modulePath);
    generateDto(databaseModel, generationOptions, dtoPath);
}

function generateModules(
    databaseModel: Entity[],
    generationOptions: IGenerationOptions,
    modulePath: string
) {
    const entityTemplatePath = path.resolve(
        __dirname,
        "templates",
        "module.mst"
    );
    const entityTemplate = fs.readFileSync(entityTemplatePath, "utf-8");
    const entityCompliedTemplate = Handlebars.compile(entityTemplate, {
        noEscape: true,
    });

    const moduleName = modulePath.split("/").pop();

    const renderData = { moduleName, databaseModel };

    const resultFilePath = path.resolve(modulePath, `${moduleName}.module.ts`);

    const rendered = entityCompliedTemplate(renderData);
    const withImportStatements = removeUnusedImports(
        EOL !== eolConverter[generationOptions.convertEol]
            ? rendered.replace(
                  /(\r\n|\n|\r)/gm,
                  eolConverter[generationOptions.convertEol]
              )
            : rendered
    );
    let formatted = "";
    try {
        formatted = Prettier.format(
            withImportStatements.replace("{}", ""),
            prettierOptions
        );
    } catch (error) {
        console.error(
            "There were some problems with model generation for module"
        );
        console.error(error);
        formatted = withImportStatements;
    }
    fs.writeFileSync(resultFilePath, formatted, {
        encoding: "utf-8",
        flag: "w",
    });
}

function generateControllers(
    databaseModel: Entity[],
    generationOptions: IGenerationOptions,
    servicesPath: string
) {
    const entityTemplatePath = path.resolve(
        __dirname,
        "templates",
        "controller.mst"
    );
    const entityTemplate = fs.readFileSync(entityTemplatePath, "utf-8");
    const entityCompliedTemplate = Handlebars.compile(entityTemplate, {
        noEscape: true,
    });
    databaseModel.forEach((element) => {
        let casedFileName = "";
        switch (generationOptions.convertCaseFile) {
            case "camel":
                casedFileName = changeCase.camelCase(element.fileName);
                break;
            case "param":
                casedFileName = changeCase.paramCase(element.fileName);
                break;
            case "pascal":
                casedFileName = changeCase.pascalCase(element.fileName);
                break;
            case "none":
                casedFileName = element.fileName;
                break;
            default:
                throw new Error("Unknown case style");
        }
        const resultFilePath = path.resolve(
            servicesPath,
            `${casedFileName}.controller.ts`
        );
        const rendered = entityCompliedTemplate({
            ...element,
            relationsOneToMany: element.relations.filter(
                (e) => e.relationType === "OneToMany"
            ),
        });
        const withImportStatements = removeUnusedImports(
            EOL !== eolConverter[generationOptions.convertEol]
                ? rendered.replace(
                      /(\r\n|\n|\r)/gm,
                      eolConverter[generationOptions.convertEol]
                  )
                : rendered
        );
        let formatted = "";
        try {
            formatted = Prettier.format(
                withImportStatements.replace("{}", ""),
                prettierOptions
            );
        } catch (error) {
            console.error(
                "There were some problems with model generation for table: ",
                element.sqlName
            );
            console.error(error);
            formatted = withImportStatements;
        }
        fs.writeFileSync(resultFilePath, formatted, {
            encoding: "utf-8",
            flag: "w",
        });
    });
}

function generateServices(
    databaseModel: Entity[],
    generationOptions: IGenerationOptions,
    servicesPath: string
) {
    const entityTemplatePath = path.resolve(
        __dirname,
        "templates",
        "service.mst"
    );
    const entityTemplate = fs.readFileSync(entityTemplatePath, "utf-8");
    const entityCompliedTemplate = Handlebars.compile(entityTemplate, {
        noEscape: true,
    });
    databaseModel.forEach((element) => {
        let casedFileName = "";
        switch (generationOptions.convertCaseFile) {
            case "camel":
                casedFileName = changeCase.camelCase(element.fileName);
                break;
            case "param":
                casedFileName = changeCase.paramCase(element.fileName);
                break;
            case "pascal":
                casedFileName = changeCase.pascalCase(element.fileName);
                break;
            case "none":
                casedFileName = element.fileName;
                break;
            default:
                throw new Error("Unknown case style");
        }
        const resultFilePath = path.resolve(
            servicesPath,
            `${casedFileName}.service.ts`
        );
        const rendered = entityCompliedTemplate(element);
        const withImportStatements = removeUnusedImports(
            EOL !== eolConverter[generationOptions.convertEol]
                ? rendered.replace(
                      /(\r\n|\n|\r)/gm,
                      eolConverter[generationOptions.convertEol]
                  )
                : rendered
        );
        let formatted = "";
        try {
            formatted = Prettier.format(
                withImportStatements.replace("{}", ""),
                prettierOptions
            );
        } catch (error) {
            console.error(
                "There were some problems with model generation for table: ",
                element.sqlName
            );
            console.error(error);
            formatted = withImportStatements;
        }
        fs.writeFileSync(resultFilePath, formatted, {
            encoding: "utf-8",
            flag: "w",
        });
    });
}

function generateDto(
    databaseModel: Entity[],
    generationOptions: IGenerationOptions,
    entitiesPath: string
) {
    const entityTemplatePath = path.resolve(__dirname, "templates", "dto.mst");
    const entityTemplate = fs.readFileSync(entityTemplatePath, "utf-8");
    const entityCompliedTemplate = Handlebars.compile(entityTemplate, {
        noEscape: true,
    });
    databaseModel.forEach((entity) => {
        let casedFileName = "";
        const element = { ...entity };

        element.columns = element.columns.filter((e) => {
            const join = element.relations.filter(
                (f) => f.relationType === "ManyToOne"
            );
            let check = true;
            join.forEach((g) => {
                if (
                    g.joinColumnOptions &&
                    g.joinColumnOptions.find((f) => f.name === e.tscName)
                ) {
                    check = false;
                }
            });
            if (e.primary) {
                check = false;
            }
            return check;
        });
        element.relations = element.relations.filter(
            (f) => f.relationType === "OneToMany"
        );

        switch (generationOptions.convertCaseFile) {
            case "camel":
                casedFileName = changeCase.camelCase(element.fileName);
                break;
            case "param":
                casedFileName = changeCase.paramCase(element.fileName);
                break;
            case "pascal":
                casedFileName = changeCase.pascalCase(element.fileName);
                break;
            case "none":
                casedFileName = element.fileName;
                break;
            default:
                throw new Error("Unknown case style");
        }
        const resultFilePath = path.resolve(
            entitiesPath,
            `${casedFileName}.dto.ts`
        );
        const rendered = entityCompliedTemplate(element);
        const withImportStatements = removeUnusedImports(
            EOL !== eolConverter[generationOptions.convertEol]
                ? rendered.replace(
                      /(\r\n|\n|\r)/gm,
                      eolConverter[generationOptions.convertEol]
                  )
                : rendered
        );
        let formatted = "";
        try {
            formatted = Prettier.format(
                withImportStatements.replace("{}", ""),
                prettierOptions
            );
        } catch (error) {
            console.error(
                "There were some problems with model generation for table: ",
                element.sqlName
            );
            console.error(error);
            formatted = withImportStatements;
        }
        fs.writeFileSync(resultFilePath, formatted, {
            encoding: "utf-8",
            flag: "w",
        });
    });
}

function generateModels(
    databaseModel: Entity[],
    generationOptions: IGenerationOptions,
    entitiesPath: string
) {
    const entityTemplatePath = path.resolve(
        __dirname,
        "templates",
        "entity.mst"
    );
    const entityTemplate = fs.readFileSync(entityTemplatePath, "utf-8");
    const entityCompliedTemplate = Handlebars.compile(entityTemplate, {
        noEscape: true,
    });
    databaseModel.forEach((entity) => {
        let casedFileName = "";
        const element = { ...entity };
        element.columns = element.columns.filter((e) => !e.primary);
        switch (generationOptions.convertCaseFile) {
            case "camel":
                casedFileName = changeCase.camelCase(element.fileName);
                break;
            case "param":
                casedFileName = changeCase.paramCase(element.fileName);
                break;
            case "pascal":
                casedFileName = changeCase.pascalCase(element.fileName);
                break;
            case "none":
                casedFileName = element.fileName;
                break;
            default:
                throw new Error("Unknown case style");
        }
        const resultFilePath = path.resolve(
            entitiesPath,
            `${casedFileName}.entity.ts`
        );
        const rendered = entityCompliedTemplate(element);
        const withImportStatements = removeUnusedImports(
            EOL !== eolConverter[generationOptions.convertEol]
                ? rendered.replace(
                      /(\r\n|\n|\r)/gm,
                      eolConverter[generationOptions.convertEol]
                  )
                : rendered
        );
        let formatted = "";
        try {
            formatted = Prettier.format(withImportStatements, prettierOptions);
        } catch (error) {
            console.error(
                "There were some problems with model generation for table: ",
                element.sqlName
            );
            console.error(error);
            formatted = withImportStatements;
        }
        fs.writeFileSync(resultFilePath, formatted, {
            encoding: "utf-8",
            flag: "w",
        });
    });
}

function createIndexFile(
    databaseModel: Entity[],
    generationOptions: IGenerationOptions,
    entitiesPath: string
) {
    const templatePath = path.resolve(__dirname, "templates", "index.mst");
    const template = fs.readFileSync(templatePath, "utf-8");
    const compliedTemplate = Handlebars.compile(template, {
        noEscape: true,
    });
    const rendered = compliedTemplate({ entities: databaseModel });
    const formatted = Prettier.format(rendered, prettierOptions);
    let fileName = "index";
    switch (generationOptions.convertCaseFile) {
        case "camel":
            fileName = changeCase.camelCase(fileName);
            break;
        case "param":
            fileName = changeCase.paramCase(fileName);
            break;
        case "pascal":
            fileName = changeCase.pascalCase(fileName);
            break;
        default:
    }
    const resultFilePath = path.resolve(entitiesPath, `${fileName}.ts`);
    fs.writeFileSync(resultFilePath, formatted, {
        encoding: "utf-8",
        flag: "w",
    });
}

function removeUnusedImports(rendered: string) {
    const openBracketIndex = rendered.indexOf("{") + 1;
    const closeBracketIndex = rendered.indexOf("}");
    const imports = rendered
        .substring(openBracketIndex, closeBracketIndex)
        .split(",");
    const restOfEntityDefinition = rendered.substring(closeBracketIndex);
    const distinctImports = imports.filter(
        (v) =>
            restOfEntityDefinition.indexOf(`@${v}(`) !== -1 ||
            (v === "BaseEntity" && restOfEntityDefinition.indexOf(v) !== -1)
    );
    return `${rendered.substring(0, openBracketIndex)}${distinctImports.join(
        ","
    )}${restOfEntityDefinition}`;
}

function createHandlebarsHelpers(generationOptions: IGenerationOptions): void {
    Handlebars.registerHelper("json", (context) => {
        const json = JSON.stringify(context);
        const withoutQuotes = json.replace(/"([^(")"]+)":/g, "$1:");
        return withoutQuotes.slice(1, withoutQuotes.length - 1);
    });
    Handlebars.registerHelper("toEntityName", (str) => {
        let retStr = "";
        switch (generationOptions.convertCaseEntity) {
            case "camel":
                retStr = changeCase.camelCase(str);
                break;
            case "pascal":
                retStr = changeCase.pascalCase(str);
                break;
            case "none":
                retStr = str;
                break;
            default:
                throw new Error("Unknown case style");
        }
        return `${retStr}Entity`;
    });
    Handlebars.registerHelper("toDtoName", (str) => {
        let retStr = "";
        switch (generationOptions.convertCaseEntity) {
            case "camel":
                retStr = changeCase.camelCase(str);
                break;
            case "pascal":
                retStr = changeCase.pascalCase(str);
                break;
            case "none":
                retStr = str;
                break;
            default:
                throw new Error("Unknown case style");
        }
        return `${retStr}Dto`;
    });
    Handlebars.registerHelper("toFileName", (str) => {
        let retStr = "";
        switch (generationOptions.convertCaseFile) {
            case "camel":
                retStr = changeCase.camelCase(str);
                break;
            case "param":
                retStr = changeCase.paramCase(str);
                break;
            case "pascal":
                retStr = changeCase.pascalCase(str);
                break;
            case "none":
                retStr = str;
                break;
            default:
                throw new Error("Unknown case style");
        }
        return `${retStr}.entity`;
    });
    Handlebars.registerHelper("toDtoFileName", (str) => {
        let retStr = "";
        switch (generationOptions.convertCaseFile) {
            case "camel":
                retStr = changeCase.camelCase(str);
                break;
            case "param":
                retStr = changeCase.paramCase(str);
                break;
            case "pascal":
                retStr = changeCase.pascalCase(str);
                break;
            case "none":
                retStr = str;
                break;
            default:
                throw new Error("Unknown case style");
        }
        return `${retStr}.dto`;
    });
    Handlebars.registerHelper("toServiceName", (str) => {
        let retStr = "";
        switch (generationOptions.convertCaseEntity) {
            case "camel":
                retStr = changeCase.camelCase(str);
                break;
            case "pascal":
                retStr = changeCase.pascalCase(str);
                break;
            case "none":
                retStr = str;
                break;
            default:
                throw new Error("Unknown case style");
        }
        return `${retStr}Service`;
    });

    Handlebars.registerHelper("toModuleName", (str) => {
        let retStr = "";
        switch (generationOptions.convertCaseEntity) {
            case "camel":
                retStr = changeCase.camelCase(str);
                break;
            case "pascal":
                retStr = changeCase.pascalCase(str);
                break;
            case "none":
                retStr = str;
                break;
            default:
                throw new Error("Unknown case style");
        }
        return `${retStr}Module`;
    });

    Handlebars.registerHelper("toControllerName", (str) => {
        let retStr = "";
        switch (generationOptions.convertCaseEntity) {
            case "camel":
                retStr = changeCase.camelCase(str);
                break;
            case "pascal":
                retStr = changeCase.pascalCase(str);
                break;
            case "none":
                retStr = str;
                break;
            default:
                throw new Error("Unknown case style");
        }
        return `${retStr}Controller`;
    });

    Handlebars.registerHelper("toControllerFileName", (str) => {
        let retStr = "";
        switch (generationOptions.convertCaseFile) {
            case "camel":
                retStr = changeCase.camelCase(str);
                break;
            case "pascal":
                retStr = changeCase.pascalCase(str);
                break;
            case "none":
                retStr = str;
                break;
            default:
                throw new Error("Unknown case style");
        }
        return `${retStr}.controller`;
    });

    Handlebars.registerHelper("toServiceFileName", (str) => {
        let retStr = "";
        switch (generationOptions.convertCaseFile) {
            case "camel":
                retStr = changeCase.camelCase(str);
                break;
            case "param":
                retStr = changeCase.paramCase(str);
                break;
            case "pascal":
                retStr = changeCase.pascalCase(str);
                break;
            case "none":
                retStr = str;
                break;
            default:
                throw new Error("Unknown case style");
        }
        return `${retStr}.service`;
    });

    Handlebars.registerHelper("printPropertyVisibility", () =>
        generationOptions.propertyVisibility !== "none"
            ? `${generationOptions.propertyVisibility} `
            : ""
    );
    Handlebars.registerHelper("toPropertyName", (str) => {
        let retStr = "";
        switch (generationOptions.convertCaseProperty) {
            case "camel":
                retStr = changeCase.camelCase(str);
                break;
            case "pascal":
                retStr = changeCase.pascalCase(str);
                break;
            case "none":
                retStr = str;
                break;
            case "snake":
                retStr = changeCase.snakeCase(str);
                break;
            default:
                throw new Error("Unknown case style");
        }
        return retStr;
    });
    Handlebars.registerHelper(
        "toRelation",
        (entityType: string, relationType: Relation["relationType"]) => {
            let retVal = entityType;
            if (relationType === "ManyToMany" || relationType === "OneToMany") {
                retVal = `${retVal}[]`;
            }
            if (generationOptions.lazy) {
                retVal = `Promise<${retVal}>`;
            }
            return retVal;
        }
    );
    Handlebars.registerHelper("defaultExport", () =>
        generationOptions.exportType === "default" ? "default" : ""
    );
    Handlebars.registerHelper("localImport", (entityName: string) =>
        generationOptions.exportType === "default"
            ? entityName
            : `{${entityName}}`
    );
    Handlebars.registerHelper("strictMode", () =>
        generationOptions.strictMode !== "none"
            ? generationOptions.strictMode
            : ""
    );
    Handlebars.registerHelper({
        and: (v1, v2) => v1 && v2,
        eq: (v1, v2) => v1 === v2,
        gt: (v1, v2) => v1 > v2,
        gte: (v1, v2) => v1 >= v2,
        lt: (v1, v2) => v1 < v2,
        lte: (v1, v2) => v1 <= v2,
        ne: (v1, v2) => v1 !== v2,
        or: (v1, v2) => v1 || v2,
    });
}

function createTsConfigFile(outputPath: string): void {
    const templatePath = path.resolve(__dirname, "templates", "tsconfig.mst");
    const template = fs.readFileSync(templatePath, "utf-8");
    const compliedTemplate = Handlebars.compile(template, {
        noEscape: true,
    });
    const rendered = compliedTemplate({});
    const formatted = Prettier.format(rendered, { parser: "json" });
    const resultFilePath = path.resolve(outputPath, "tsconfig.json");
    fs.writeFileSync(resultFilePath, formatted, {
        encoding: "utf-8",
        flag: "w",
    });
}
function createTypeOrmConfig(
    outputPath: string,
    connectionOptions: IConnectionOptions
): void {
    const templatePath = path.resolve(__dirname, "templates", "ormconfig.mst");
    const template = fs.readFileSync(templatePath, "utf-8");
    const compiledTemplate = Handlebars.compile(template, {
        noEscape: true,
    });
    const rendered = compiledTemplate(connectionOptions);
    const formatted = Prettier.format(rendered, { parser: "json" });
    const resultFilePath = path.resolve(outputPath, "ormconfig.json");
    fs.writeFileSync(resultFilePath, formatted, {
        encoding: "utf-8",
        flag: "w",
    });
}
