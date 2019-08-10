# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import unittest
import numpy as np
import torch
import os
from CountingGridsPy.models import CountingGridModel, CountingGridModelWithGPU


class TestGPUvsCPU(unittest.TestCase):
    def setUp(self):
        SEED = "03071994"
        np.random.seed(int(SEED))
        M, N = [1000, 500]
        extentSize = 40
        self.data = np.round(np.random.random((M, N)) * 10)
        self.extent = np.array([extentSize, extentSize])
        self.window = np.array([5, 5])
        self.pi_init = np.ones([extentSize] * 2 + [N]) / N
        self.cpuModel = CountingGridModel(self.extent, self.window)
        self.gpuModel = CountingGridModelWithGPU(self.extent, self.window)
    
    def tearDown(self):
        potentialFilesGenerated = [
            "CountingGridDataMatrices.mat",
            "CGData.mat"
        ]

        for fileName in potentialFilesGenerated:
            if os.path.exists(fileName):
                os.remove(fileName)

    def test_fitted_model_no_layers(self):
        numIters = 50
        self.cpuModel.fit(
            self.data,
            max_iter=numIters,
            returnSumSquareDifferencesOfPi=False,
            pi=np.copy(self.pi_init),
            layers=1
        )

        device = torch.device("cuda:0")
        self.gpuModel.fit(
            self.data,
            max_iter=numIters,
            pi=torch.tensor(self.pi_init, device=device, dtype=torch.double),
            layers=1
        )

        assert(
            all(
                np.isclose(
                    self.cpuModel.q,
                    self.gpuModel.q.cpu().numpy()
                )
            )
        )

        assert(
            all(
                np.isclose(
                    self.cpuModel.pi,
                    self.gpuModel.pi.cpu().numpy()
                )
            )
        )

        def test_fitted_model_with_layers(self):
            numIters = 50
            layers = 2
            self.cpuModel.fit(
                self.data,
                max_iter=numIters,
                returnSumSquareDifferencesOfPi=False,
                pi=np.copy(self.pi_init),
                layers= layers
            )
    
            device = torch.device("cuda:0")
            self.gpuModel.fit(
                self.data,
                max_iter=numIters,
                pi=torch.tensor(self.pi_init, device=device, dtype=torch.double),
                layers=layers
            )
    
            assert(
                all(
                    np.isclose(
                        self.cpuModel.q,
                        self.gpuModel.q.cpu().numpy()
                    )
                )
            )
    
            assert(
                all(
                    np.isclose(
                        self.cpuModel.pi,
                        self.gpuModel.pi.cpu().numpy()
                    )
                )
            )
