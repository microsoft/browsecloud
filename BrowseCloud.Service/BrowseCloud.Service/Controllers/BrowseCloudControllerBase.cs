// <copyright file="BrowseCloudControllerBase.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Controllers
{
    using System.Diagnostics.Contracts;
    using BrowseCloud.Service.Models.Configurations;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.Extensions.Logging;
    using Microsoft.Extensions.Options;

    /// <summary>
    /// Controller Base for all BrowseCloud controllers.
    /// Contains common properties.
    /// </summary>
    public class BrowseCloudControllerBase : ControllerBase
    {
        /// <summary>
        /// Logger - Dependency Injected.
        /// </summary>
        protected readonly ILogger logger;

        /// <summary>
        /// General Config - Dependency Injected.
        /// </summary>
        protected readonly GeneralConfig config;

        /// <summary>
        /// Initializes a new instance of the <see cref="BrowseCloudControllerBase"/> class.
        /// </summary>
        /// <param name="logger">Logger</param>
        /// <param name="config">General Config</param>
        public BrowseCloudControllerBase(ILogger logger, IOptions<GeneralConfig> config)
        {
            Contract.Requires(logger != null, nameof(logger));
            Contract.Requires(config != null, nameof(config));

            this.logger = logger;
            this.config = config.Value;
        }
    }
}