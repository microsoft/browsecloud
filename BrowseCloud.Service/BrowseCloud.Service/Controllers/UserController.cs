// <copyright file="UserController.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Controllers
{
    using System.Collections.Generic;
    using System.Threading.Tasks;
    using BrowseCloud.Service.Models.Configurations;
    using BrowseCloud.Service.Services.Graph;
    using Microsoft.AspNetCore.Authorization;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.Extensions.Logging;
    using Microsoft.Extensions.Options;

    /// <summary>
    /// Controller for Documents.
    /// </summary>
    [Authorize]
    [Route("api/v1/users/me")]
    [ApiController]
    public class UserController : BrowseCloudControllerBase
    {
        /// <summary>
        /// Graph Service - Dependency Injected.
        /// </summary>
        private readonly IGraphService graphService;

        /// <summary>
        /// Initializes a new instance of the <see cref="UserController"/> class.
        /// </summary>
        /// <param name="graphService">Graph Service</param>
        /// <param name="logger">Logger</param>
        /// <param name="config">General Config</param>
        public UserController(
            IGraphService graphService,
            ILogger<UserController> logger,
            IOptions<GeneralConfig> config)
            : base(logger, config)
        {
            this.graphService = graphService;
        }

        /// <summary>
        /// Get a list of all Directory Object IDs (user + all member groups) that a user identifies as.
        /// </summary>
        /// <url>http://localhost/api/v1/users/me/userIdentityIds</url>
        /// <verb>GET</verb>
        /// <response code="200"><see cref="List{T}"/>where T is <see cref="string"/> A list of group IDs appended to the user ID of the current user.</response>
        [HttpGet]
        [Route("userIdentityIds")]
        public async Task<IEnumerable<string>> UserIdentityIds()
        {
            return await this.graphService.GetAllCurrentUserIdentities();
        }
    }
}