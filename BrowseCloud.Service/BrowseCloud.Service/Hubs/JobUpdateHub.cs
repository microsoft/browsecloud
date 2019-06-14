// <copyright file="JobUpdateHub.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Hubs
{
    using System;
    using System.Collections.Generic;
    using System.Threading.Tasks;
    using BrowseCloud.Service.Common.Helpers;
    using BrowseCloud.Service.Models;
    using BrowseCloud.Service.Services.DocumentDb;
    using BrowseCloud.Service.Services.Graph;
    using Microsoft.AspNetCore.Authorization;
    using Microsoft.AspNetCore.SignalR;

    /// <summary>
    /// Sends job updates to those that can access them over SignalR.
    /// </summary>
    [Authorize]
    public class JobUpdateHub : Hub
    {
        private readonly IDocumentDbService documentDbService;
        private readonly IGraphService graphService;

        /// <summary>
        /// Initializes a new instance of the <see cref="JobUpdateHub"/> class.
        /// </summary>
        /// <param name="documentDbService">IDocumentDbService - Dependency Injected.</param>
        /// <param name="graphService">IGraphService - Dependency Injected.</param>
        public JobUpdateHub(IDocumentDbService documentDbService, IGraphService graphService)
            : base()
        {
            this.documentDbService = documentDbService;
            this.graphService = graphService;
        }

        /// <summary>
        /// When a user connects to the SignalR endpoint.
        /// </summary>
        /// <returns></returns>
        public override async Task OnConnectedAsync()
        {
            foreach (Document document in await this.GetDocuments())
            {
                await this.Groups.AddToGroupAsync(this.Context.ConnectionId, document.Id.ToString());
            }

            await base.OnConnectedAsync();
        }

        /// <summary>
        /// When a user disconnects from the SignalR endpoint.
        /// </summary>
        /// <param name="exception">Exception if disconnected due to error</param>
        /// <returns></returns>
        public override async Task OnDisconnectedAsync(Exception exception)
        {
            foreach (Document document in await this.GetDocuments())
            {
                await this.Groups.RemoveFromGroupAsync(this.Context.ConnectionId, document.Id.ToString());
            }

            await base.OnDisconnectedAsync(exception);
        }

        private async Task<IEnumerable<Document>> GetDocuments()
        {
            var idsToSearch = await this.graphService.GetAllCurrentUserIdentities();
            return await DocumentHelper.GetAllAccessibleDocuments(idsToSearch, this.documentDbService);
        }
    }
}
