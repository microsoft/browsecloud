// <copyright file="Program.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service
{
    using System.IO;
    using BrowseCloud.Service.Models.Configurations;
    using BrowseCloud.Service.Services.KeyVault;
    using Microsoft.AspNetCore;
    using Microsoft.AspNetCore.Hosting;
    using Microsoft.Extensions.Configuration;
    using Microsoft.Extensions.DependencyInjection;

    /// <summary>
    /// Root program start
    /// </summary>
    public static class Program
    {
        /// <summary>
        /// Entry
        /// </summary>
        /// <param name="args">command line args</param>
        public static void Main(string[] args)
        {
            CreateWebHostBuilder(args)
                .Build()
                .Run();
        }

        /// <summary>
        /// Setup web server
        /// </summary>
        /// <param name="args">command line args</param>
        /// <returns></returns>
        public static IWebHostBuilder CreateWebHostBuilder(string[] args)
        {
            var config = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false)
                .AddEnvironmentVariables()
                .AddCommandLine(args)
                .Build();

            return WebHost.CreateDefaultBuilder(args)
                .UseConfiguration(config)
                .ConfigureServices(services =>
                {
                    services.Configure<KeyVaultConfig>(config.GetSection("KeyVault"));
                    services.AddSingleton<IKeyVaultService, KeyVaultService>();
                })
                .UseApplicationInsights()
                .UseStartup<Startup>();
        }
    }
}
