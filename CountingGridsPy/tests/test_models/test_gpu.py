# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import unittest
import numpy as np
from CountingGridsPy.models import CountingGridModel, CountingGridsModelWithGPU
import torch


class TestGPUvsCPU(unittest.TestCase):
    def setUp(self):
        SEED = "03071994"
        np.random.seed(SEED)
        M, N = [10000, 500]
        self.N = N
        self.data = np.round(np.random.random((M, N)) * 10)
        self.extent = np.array([40, 40])
        self.window = np.array([5, 5])
        self.pi_init = np.ones([5]*2 + [N]) / 1000
        self.cpuModel = CountingGridModel(self.extent, self.window)
        self.gpuModel = CountingGridsModelWithGPU(self.extent, self.window)

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
