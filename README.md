<!-- PROJECT LOGO -->
<br />
<p align="center">
  <h3 align="center">Zod Prisma</h3>
  <p align="center">
    A custom prisma generator that creates Zod schemas from your Prisma model.
  </p>
</p>

<!-- ABOUT THE PROJECT -->

## Forked Version of Zod Prisma
Initially this generated was created by Carter Grimmeisen, but unfortunately only support for Prisma 3. I got tired of having update Zod Schema manually. This repo provides generating prisma schema model and keep the simplicity.

- Support Prisma 4.*
- For Internal Use Only

<!-- [![Product Name Screen Shot][product-screenshot]](https://example.com) -->

### Built With

-   [dts-cli](https://github.com/weiran-zsd/dts-cli)
-   [Zod](https://github.com/colinhacks/zod)
-   [Forked Version](https://github.com/CarterGrimmeisen/zod-prisma)

<!-- GETTING STARTED -->

## Getting Started

To get a local copy up and running follow these simple steps.

### Installation

0.  **Ensure your tsconfig.json enables the compiler's strict mode.**
    **Zod requires it and so do we, you will experience TS errors without strict mode enabled**

1.  Add zod-prisma as a dev dependency

    ```sh
    pnpm add -D @fortezhuo/zod-prisma
    ```

2.  Add the zod-prisma generator to your schema.prisma

    ```prisma
    generator zod {
      provider                 = "zod-prisma"
      output                   = "./zod" // (default) the directory where generated zod schemas will be saved

      relationModel            = true // (default) Create and export both plain and related models.
      // relationModel         = "default" // Do not export model without relations.
      // relationModel         = false // Do not generate related model

      modelCase                = "PascalCase" // (default) Output models using pascal case (ex. UserModel, PostModel)
      // modelCase             = "camelCase" // Output models using camel case (ex. userModel, postModel)

      modelSuffix              = "_model" // (default) Suffix to apply to your prisma models when naming Zod schemas

      imports                  = null // (default) will import the referenced file in generated schemas to be used via imports.someExportedVariable

      // https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-by-null-values
      prismaJsonNullability    = true // (default) uses prisma's scheme for JSON field nullability
      // prismaJsonNullability = false // allows null assignment to optional JSON fields
    }
    ```

3.  Run `npx prisma generate` or `pnpm dlx prisma generate` to generate your zod schemas
4.  Import the generated schemas form your selected output location

<!-- USAGE EXAMPLES -->

## License

Distributed under the MIT License. See `LICENSE` for more information.

<!-- CONTACT -->

## Special Thanks 

Carter Grimmeisen for awesome Prisma Generator [https://github.com/CarterGrimmeisen/zod-prisma](https://github.com/CarterGrimmeisen/zod-prisma)