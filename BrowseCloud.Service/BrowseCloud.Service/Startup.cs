// <copyright file="Startup.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service
{
    using System;
    using System.Collections.Generic;
    using System.Threading.Tasks;
    using BrowseCloud.Service.Hubs;
    using BrowseCloud.Service.Models.Configurations;
    using BrowseCloud.Service.Services.AzureBatch;
    using BrowseCloud.Service.Services.AzureStorage;
    using BrowseCloud.Service.Services.DocumentDb;
    using BrowseCloud.Service.Services.Graph;
    using BrowseCloud.Service.Services.KeyVault;
    using BrowseCloud.Service.Utils;
    using Microsoft.ApplicationInsights.Extensibility;
    using Microsoft.AspNetCore.Authentication;
    using Microsoft.AspNetCore.Authentication.AzureAD.UI;
    using Microsoft.AspNetCore.Authentication.JwtBearer;
    using Microsoft.AspNetCore.Builder;
    using Microsoft.AspNetCore.Hosting;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.AspNetCore.SignalR;
    using Microsoft.Extensions.Configuration;
    using Microsoft.Extensions.DependencyInjection;
    using Microsoft.Extensions.Logging;

    /// <summary>
    /// Startup
    /// </summary>
    public class Startup
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="Startup"/> class.
        /// </summary>
        /// <param name="configuration">All Configurations</param>
        /// <param name="keyVaultService">Key Vault Service</param>
        public Startup(IConfiguration configuration, IKeyVaultService keyVaultService)
        {
            this.Configuration = configuration;
            this.KeyVaultService = keyVaultService;
        }

        /// <summary>
        /// Configuration
        /// </summary>
        public IConfiguration Configuration { get; set; }

        /// <summary>
        /// Key Vault Service
        /// </summary>
        public IKeyVaultService KeyVaultService { get; set; }

        /// <summary>
        /// This method gets called by the runtime. Use this method to add services to the container.
        /// </summary>
        /// <param name="services">Service Connection</param>
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddAuthentication(AzureADDefaults.JwtBearerAuthenticationScheme)
                .AddAzureADBearer(options => this.Configuration.Bind("AzureAd", options));

            services.Configure<JwtBearerOptions>(AzureADDefaults.JwtBearerAuthenticationScheme, options =>
            {
                options.SaveToken = true;

                options.Events = new JwtBearerEvents
                {
                    // Handle access tokens in header for signalr
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;

                        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/jobupdatehub", StringComparison.InvariantCultureIgnoreCase))
                        {
                            context.Token = context.Request.Query["access_token"];
                        }
                        return Task.CompletedTask;
                    }
                };
            });

            // Add MVC.
            services.AddMvc(options =>
            {
                options.Filters.Add(new SimpleExceptionFilterAttribute());
                options.Filters.Add(new ActionTrackerAttribute());
                options.InputFormatters.Insert(0, new RawRequestBodyFormatter());
            })
                .SetCompatibilityVersion(CompatibilityVersion.Version_2_2)
                .AddJsonOptions(options =>
                 {
                     options.SerializerSettings.Converters.Add(new Newtonsoft.Json.Converters.StringEnumConverter());
                     options.SerializerSettings.NullValueHandling = Newtonsoft.Json.NullValueHandling.Ignore;
                 });

            // Use Cors.
            var corsOriginsString = this.Configuration["General:CorsOrigins"];
            var corsOrigins = string.IsNullOrWhiteSpace(corsOriginsString) ? new List<string> { "*" }.ToArray() : corsOriginsString.Split(',', ';');
            services.AddCors(o => o.AddPolicy("OpenPolicy", builder =>
            {
                builder.WithOrigins(corsOrigins)
                       .AllowAnyMethod()
                       .AllowAnyHeader()
                       .AllowCredentials();
            }));

            // SignalR Setup.
            services.AddSignalR();

            // Redis cache setup.
            var redisConnectionString = this.KeyVaultService.GetSecret(this.Configuration["Redis:ConfigurationKeyVaultKey"]).Result;
            services.AddDistributedRedisCache(options =>
            {
                options.Configuration = redisConnectionString;
                options.InstanceName = this.Configuration["Redis:InstanceName"];
            });

            // Add data protection.
            // TODO jawindso: fix redis caching of key.
            // var redis = ConnectionMultiplexer.Connect(redisConnectionString);
            services.AddDataProtection();

            // .SetApplicationName(Configuration["Redis:InstanceName"])
            // .PersistKeysToStackExchangeRedis(redis, $"DataProtection");

            // Add functionality to inject IOptions<T>.
            services.AddOptions();

            // Add configurations.
            services.Configure<AzureBatchConfig>(this.Configuration.GetSection("Batch"));
            services.Configure<DocumentDbConfig>(this.Configuration.GetSection("DocumentDb"));
            services.Configure<GeneralConfig>(this.Configuration.GetSection("General"));
            services.Configure<AzureStorageConfig>(this.Configuration.GetSection("Storage"));
            services.Configure<AzureAdConfig>(this.Configuration.GetSection("AzureAd"));

            // Service injection.
            services.AddSingleton<IBatchService, BatchService>();
            services.AddSingleton<IStorageService, StorageService>();
            services.AddSingleton<IDocumentDbService, DocumentDbService>();
            services.AddSingleton<IGraphService, GraphService>();

            // Inject telemetry initializer.
            services.AddSingleton<ITelemetryInitializer, RequestDataTelemetryInitializer>();
        }

        /// <summary>
        /// This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        /// </summary>
        /// <param name="app">Application Builder</param>
        /// <param name="env">Hosting Environment</param>
        /// <param name="loggerFactory">Logger Factory</param>
        public void Configure(IApplicationBuilder app, IHostingEnvironment env, ILoggerFactory loggerFactory)
        {
            if (app == null)
            {
                return;
            }

            loggerFactory.AddApplicationInsights(app.ApplicationServices, LogLevel.Information);

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseHsts();
            }

            app.UseHttpsRedirection();
            app.UseAuthentication();

            // Cors setup.
            app.UseCors("OpenPolicy");

            // SignalR Setup.
            app.UseWebSockets();
            app.UseSignalR(options =>
            {
                options.MapHub<JobUpdateHub>("/jobupdatehub");
            });

            app.UseMvc();
        }
    }
}
