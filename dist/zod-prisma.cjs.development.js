'use strict';

var generatorHelper = require('@prisma/generator-helper');
var typescript = require('typescript');
var zod = require('zod');
var path = require('path');
var tsMorph = require('ts-morph');
var parenthesis = require('parenthesis');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var path__default = /*#__PURE__*/_interopDefaultLegacy(path);

var version = "0.5.15";

const configBoolean = /*#__PURE__*/zod.z.enum(['true', 'false']).transform(arg => JSON.parse(arg));
const configSchema = /*#__PURE__*/zod.z.object({
  relationModel: /*#__PURE__*/configBoolean.default('true').or( /*#__PURE__*/zod.z.literal('default')),
  modelSuffix: /*#__PURE__*/zod.z.string().default('_model'),
  modelCase: /*#__PURE__*/zod.z.enum(['PascalCase', 'camelCase']).default('PascalCase'),
  useDecimalJs: /*#__PURE__*/configBoolean.default('false'),
  imports: /*#__PURE__*/zod.z.string().optional(),
  prismaJsonNullability: /*#__PURE__*/configBoolean.default('true')
});

const writeArray = (writer, array, newLine = true) => array.forEach(line => writer.write(line).conditionalNewLine(newLine));
const useModelNames = ({
  modelCase,
  modelSuffix,
  relationModel
}) => {
  const formatModelName = (name, prefix = '') => {
    if (modelCase === 'camelCase') {
      name = name.slice(0, 1).toLowerCase() + name.slice(1);
    }
    return `${prefix}${name}${modelSuffix}`;
  };
  return {
    modelName: name => formatModelName(name, relationModel === 'default' ? '_' : ''),
    relatedModelName: name => formatModelName(relationModel === 'default' ? name.toString() : `related_${name.toString()}`)
  };
};
const needsRelatedModel = (model, config) => model.fields.some(field => field.kind === 'object') && config.relationModel !== false;
const chunk = (input, size) => {
  return input.reduce((arr, item, idx) => {
    return idx % size === 0 ? [...arr, [item]] : [...arr.slice(0, -1), [...arr.slice(-1)[0], item]];
  }, []);
};
const dotSlash = input => {
  const converted = input.replace(/^\\\\\?\\/, '').replace(/\\/g, '/').replace(/\/\/+/g, '/');
  if (converted.includes(`/node_modules/`)) return converted.split(`/node_modules/`).slice(-1)[0];
  if (converted.startsWith(`../`)) return converted;
  return './' + converted;
};

const getJSDocs = docString => {
  const lines = [];
  if (docString) {
    const docLines = docString.split('\n').filter(dL => !dL.trimStart().startsWith('@zod'));
    if (docLines.length) {
      lines.push('/**');
      docLines.forEach(dL => lines.push(` * ${dL}`));
      lines.push(' */');
    }
  }
  return lines;
};
const getZodDocElements = docString => docString.split('\n').filter(line => line.trimStart().startsWith('@zod')).map(line => line.trimStart().slice(4)).flatMap(line =>
// Array.from(line.matchAll(/\.([^().]+\(.*?\))/g), (m) => m.slice(1)).flat()
chunk(parenthesis.parse(line), 2).slice(0, -1).map(([each, contents]) => each.replace(/\)?\./, '') + `${parenthesis.stringify(contents)})`));
const computeCustomSchema = docString => {
  var _getZodDocElements$fi;
  return (_getZodDocElements$fi = getZodDocElements(docString).find(modifier => modifier.startsWith('custom('))) == null ? void 0 : _getZodDocElements$fi.slice(7).slice(0, -1);
};
const computeModifiers = docString => {
  return getZodDocElements(docString).filter(each => !each.startsWith('custom('));
};

const getZodConstructor = (field, getRelatedModelName = name => name.toString()) => {
  let zodType = 'z.unknown()';
  let extraModifiers = [''];
  if (field.kind === 'scalar') {
    switch (field.type) {
      case 'String':
        zodType = 'z.string()';
        if (field.isRequired) {
          extraModifiers.push('min(1, { message: "Required." })');
        }
        break;
      case 'Int':
        zodType = 'z.number()';
        extraModifiers.push('int()');
        break;
      case 'BigInt':
        zodType = 'z.bigint()';
        break;
      case 'DateTime':
        zodType = 'z.coerce.date()';
        break;
      case 'Float':
        zodType = 'z.preprocess((arg) => typeof arg === "string" ? +arg : arg, z.number())';
        break;
      case 'Decimal':
        zodType = 'z.preprocess((arg) => typeof arg === "string" ? +arg : arg, z.number())';
        break;
      case 'Json':
        zodType = 'z.record(z.any())';
        break;
      case 'Boolean':
        zodType = 'z.boolean()';
        break;
      // TODO: Proper type for bytes fields
      case 'Bytes':
        zodType = 'z.unknown()';
        break;
    }
  } else if (field.kind === 'enum') {
    zodType = `z.nativeEnum(${field.type})`;
  } else if (field.kind === 'object') {
    zodType = getRelatedModelName(field.type);
  }
  if (field.isList) {
    extraModifiers.push('array()');
  }
  if (field.documentation) {
    var _computeCustomSchema;
    zodType = (_computeCustomSchema = computeCustomSchema(field.documentation)) != null ? _computeCustomSchema : zodType;
    extraModifiers.push(...computeModifiers(field.documentation));
  }
  if (!field.isRequired || field.isUpdatedAt || field.hasDefaultValue) {
    extraModifiers.push('optional()');
    if (!field.isId && !field.hasDefaultValue && !field.isList && !field.isUpdatedAt) {
      extraModifiers.push('nullable()');
    }
  }
  return `${zodType}${extraModifiers.join('.')}`;
};

const writeImportsForModel = (model, sourceFile, config, {
  schemaPath,
  outputPath,
  clientPath
}) => {
  const {
    modelName
  } = useModelNames(config);
  const importList = [{
    kind: tsMorph.StructureKind.ImportDeclaration,
    namespaceImport: 'z',
    moduleSpecifier: 'zod'
  }];
  if (config.imports) {
    importList.push({
      kind: tsMorph.StructureKind.ImportDeclaration,
      namespaceImport: 'imports',
      moduleSpecifier: dotSlash(path__default["default"].relative(outputPath, path__default["default"].resolve(path__default["default"].dirname(schemaPath), config.imports)))
    });
  }
  const enumFields = model.fields.filter(f => f.kind === 'enum');
  const relationFields = model.fields.filter(f => f.kind === 'object');
  const relativePath = path__default["default"].relative(outputPath, clientPath);
  if (enumFields.length > 0) {
    importList.push({
      kind: tsMorph.StructureKind.ImportDeclaration,
      isTypeOnly: enumFields.length === 0,
      moduleSpecifier: dotSlash(relativePath),
      defaultImport: 'prisma'
    });
  }
  if (config.relationModel !== false && relationFields.length > 0) {
    const filteredFields = relationFields.filter(f => f.type !== model.name);
    if (filteredFields.length > 0) {
      importList.push({
        kind: tsMorph.StructureKind.ImportDeclaration,
        moduleSpecifier: './index',
        namedImports: Array.from(new Set(filteredFields.flatMap(f => [`${modelName(f.type)}`])))
      });
    }
  }
  sourceFile.addImportDeclarations(importList);
};
const generateSchemaForModel = (model, sourceFile, config, _prismaOptions) => {
  const {
    modelName
  } = useModelNames(config);
  sourceFile.addVariableStatement({
    declarationKind: tsMorph.VariableDeclarationKind.Const,
    isExported: true,
    leadingTrivia: writer => writer.blankLineIfLastNot(),
    declarations: [{
      name: modelName(model.name),
      initializer(writer) {
        writer.write('z.object(').inlineBlock(() => {
          model.fields.filter(f => f.kind !== 'object').forEach(field => {
            writeArray(writer, getJSDocs(field.documentation));
            writer.write(`${field.name}: ${getZodConstructor(field)}`).write(',').newLine();
          });
        }).write(')');
      }
    }]
  });
};
const generateRelatedSchemaForModel = (model, sourceFile, config, _prismaOptions) => {
  const {
    modelName,
    relatedModelName
  } = useModelNames(config);
  const relationFields = model.fields.filter(f => f.kind === 'object');
  sourceFile.addStatements(writer => writeArray(writer, ['', '// NOTE: Lazy required in case of potential circular dependencies within schema', '']));
  sourceFile.addVariableStatement({
    declarationKind: tsMorph.VariableDeclarationKind.Const,
    isExported: true,
    declarations: [{
      name: relatedModelName(model.name),
      type: "",
      initializer(writer) {
        writer.write(`z.lazy(() => ${modelName(model.name)}.extend(`).inlineBlock(() => {
          relationFields.forEach(field => {
            writeArray(writer, getJSDocs(field.documentation));
            writer.write(`${field.name}: ${getZodConstructor(field, modelName)}`).write(',').newLine();
          });
        }).write('))');
      }
    }]
  });
};
const populateModelFile = (model, sourceFile, config, prismaOptions) => {
  writeImportsForModel(model, sourceFile, config, prismaOptions);
  generateSchemaForModel(model, sourceFile, config);
  if (needsRelatedModel(model, config)) generateRelatedSchemaForModel(model, sourceFile, config);
};
const generateBarrelFile = (models, indexFile) => {
  models.forEach(model => indexFile.addExportDeclaration({
    moduleSpecifier: `./${model.name.toLowerCase()}`
  }));
};

// @ts-ignore Importing package.json for automated synchronization of version numbers
generatorHelper.generatorHandler({
  onManifest() {
    return {
      version,
      prettyName: 'Zod Schemas',
      defaultOutput: 'zod'
    };
  },
  onGenerate(options) {
    const project = new tsMorph.Project();
    const models = options.dmmf.datamodel.models;
    const {
      schemaPath
    } = options;
    const outputPath = options.generator.output.value;
    const clientPath = options.otherGenerators.find(each => each.provider.value === 'prisma-client-js').output.value;
    const results = configSchema.safeParse(options.generator.config);
    if (!results.success) throw new Error('Incorrect config provided. Please check the values you provided and try again.');
    const config = results.data;
    const prismaOptions = {
      clientPath,
      outputPath,
      schemaPath
    };
    const indexFile = project.createSourceFile(`${outputPath}/index.ts`, {}, {
      overwrite: true
    });
    generateBarrelFile(models, indexFile);
    indexFile.formatText({
      indentSize: 2,
      convertTabsToSpaces: true,
      semicolons: typescript.SemicolonPreference.Remove
    });
    models.forEach(model => {
      const sourceFile = project.createSourceFile(`${outputPath}/${model.name.toLowerCase()}.ts`, {}, {
        overwrite: true
      });
      populateModelFile(model, sourceFile, config, prismaOptions);
      sourceFile.formatText({
        indentSize: 2,
        convertTabsToSpaces: true,
        semicolons: typescript.SemicolonPreference.Remove
      });
    });
    return project.save();
  }
});
//# sourceMappingURL=zod-prisma.cjs.development.js.map
