import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { FilesModule } from './files/files.module';
import { AuthModule } from './auth/auth.module';
import databaseConfig from './database/config/database.config';
import authConfig from './auth/config/auth.config';
import appConfig from './config/app.config';
import mailConfig from './mail/config/mail.config';
import fileConfig from './files/config/file.config';
import facebookConfig from './auth-facebook/config/facebook.config';
import googleConfig from './auth-google/config/google.config';
import appleConfig from './auth-apple/config/apple.config';
import path from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthAppleModule } from './auth-apple/auth-apple.module';
import { AuthFacebookModule } from './auth-facebook/auth-facebook.module';
import { AuthGoogleModule } from './auth-google/auth-google.module';
import { HeaderResolver, I18nModule } from 'nestjs-i18n';
import { TypeOrmConfigService } from './database/typeorm-config.service';
import { MailModule } from './mail/mail.module';
import { HomeModule } from './home/home.module';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AllConfigType } from './config/config.type';
import { SessionModule } from './session/session.module';
import { MailerModule } from './mailer/mailer.module';
import { MongooseModule } from '@nestjs/mongoose';
import { MongooseConfigService } from './database/mongoose-config.service';
import { DatabaseConfig } from './database/config/database-config.type';
import githubConfig from './github-stats/config/github.config';
import { GithubStatsModule } from './github-stats/github-stats.module';
import { GithubApiModule } from './github-api/github-api.module';

const shouldEnableDatabase = process.env.ENABLE_DATABASE === 'true';
const shouldEnableI18n = process.env.ENABLE_I18N === 'true';

// Keep database connection disabled by default for early phases.
const infrastructureDatabaseModules = shouldEnableDatabase
  ? [
      (databaseConfig() as DatabaseConfig).isDocumentDatabase
        ? MongooseModule.forRootAsync({
            useClass: MongooseConfigService,
          })
        : TypeOrmModule.forRootAsync({
            useClass: TypeOrmConfigService,
            dataSourceFactory: async (options: DataSourceOptions) => {
              return new DataSource(options).initialize();
            },
          }),
    ]
  : [];

const databaseFeatureModules = shouldEnableDatabase
  ? [
      UsersModule,
      FilesModule,
      AuthModule,
      AuthFacebookModule,
      AuthGoogleModule,
      AuthAppleModule,
      SessionModule,
      MailModule,
    ]
  : [];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        authConfig,
        appConfig,
        mailConfig,
        fileConfig,
        facebookConfig,
        googleConfig,
        appleConfig,
        githubConfig,
      ],
      envFilePath: ['.env'],
    }),
    ...infrastructureDatabaseModules,
    ...(shouldEnableI18n
      ? [
          I18nModule.forRootAsync({
            useFactory: (configService: ConfigService<AllConfigType>) => ({
              fallbackLanguage: configService.getOrThrow(
                'app.fallbackLanguage',
                {
                  infer: true,
                },
              ),
              loaderOptions: {
                path: path.join(__dirname, '/i18n/'),
                watch: true,
              },
            }),
            resolvers: [
              {
                use: HeaderResolver,
                useFactory: (configService: ConfigService<AllConfigType>) => {
                  return [
                    configService.get('app.headerLanguage', {
                      infer: true,
                    }),
                  ];
                },
                inject: [ConfigService],
              },
            ],
            imports: [ConfigModule],
            inject: [ConfigService],
          }),
        ]
      : []),
    ...databaseFeatureModules,
    MailerModule,
    HomeModule,
    GithubStatsModule,
    GithubApiModule,
  ],
})
export class AppModule {}
